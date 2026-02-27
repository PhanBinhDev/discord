import { PaginatedQueryStatus } from '@/types';
import {
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefCallback,
  type RefObject,
} from 'react';

/**
 * Options for useInfiniteScrollObserver hook
 */
export interface UseInfiniteScrollObserverOptions {
  /** Current pagination status from useConvexInfiniteQuery */
  status: PaginatedQueryStatus;
  /** Load more function from useConvexInfiniteQuery */
  loadMore: (numItems?: number) => void;
  /** Reset key to re-check sentinel visibility after dataset changes or cached loads */
  resetKey?: string;
  /** Number of items to load per page (default: 25) */
  pageSize?: number;
  /** Pixels before viewport edge to trigger load (default: 200) */
  margin?: number;
  /** Optional scroll container ref for app shell layout (used as IntersectionObserver root).
   *  Accepts a RefObject so the element is read in effects/callbacks, not during render. */
  scrollContainerRef?: RefObject<HTMLElement | null>;
}

/**
 * Return value from useInfiniteScrollObserver hook
 */
export interface UseInfiniteScrollObserverReturn {
  /** Callback ref to attach to the sentinel element that triggers load more */
  sentinelRef: RefCallback<HTMLDivElement | null>;
}

/**
 * Hook that handles IntersectionObserver logic for infinite scroll.
 *
 * Encapsulates the ~75 lines of observer logic that was previously duplicated
 * across each feed page. Handles:
 * - Single observer creation on mount (never recreated to prevent scroll jumps)
 * - Stale closure prevention via refs
 * - Edge case where sentinel is in viewport before CanLoadMore status
 * - Reset key handling for filter/sort changes with cached data
 * - Loading guard to prevent duplicate load requests
 * - Non-blocking updates via React 18's startTransition
 *
 * @example
 * ```tsx
 * const { results, status, loadMore } = useConvexInfiniteQuery(...)
 * const { sentinelRef } = useInfiniteScrollObserver({ status, loadMore })
 *
 * return (
 *   <>
 *     {results.map(item => <Item key={item._id} />)}
 *     <div ref={sentinelRef} style={{ height: '1px' }} />
 *   </>
 * )
 * ```
 */

export function useInfiniteScrollObserver(
  options: UseInfiniteScrollObserverOptions,
): UseInfiniteScrollObserverReturn {
  const {
    status,
    loadMore,
    resetKey,
    pageSize = 25,
    margin = 200,
    scrollContainerRef,
  } = options;
  const useIsomorphicLayoutEffect =
    typeof window === 'undefined' ? useEffect : useLayoutEffect;

  // CALLBACK REF PATTERN
  // --------------------
  // We use a callback ref + state instead of a plain useRef to ensure we receive
  // notifications when the sentinel DOM node is actually attached/detached.
  // This is critical for cached pages where only a single render occurs;
  // standard refs might be null during the initial effect run and never re-trigger.
  const [sentinelElement, setSentinelElement] = useState<HTMLDivElement | null>(
    null,
  );

  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    setSentinelElement(node);
  }, []);

  // The IntersectionObserver instance
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Currently observed element (for re-observe detection)
  const observedElementRef = useRef<HTMLDivElement | null>(null);

  // Current pagination status (avoids stale closure)
  const statusRef = useRef(status);

  // Loading guard (prevents duplicate calls)
  const isLoadingRef = useRef(false);

  // Latest loadMore function (avoids stale closure)
  const loadMoreFnRef = useRef(loadMore);

  // Previous status (for transition detection)
  const prevStatusRef = useRef(status);

  // Capture pageSize in ref for use in callback (read only on mount)
  const pageSizeRef = useRef(pageSize);

  // Capture margin for edge case handler (read only on mount)
  const marginRef = useRef(margin);

  // Track initial mount state for cached data paths.
  const isFirstRenderRef = useRef(true);
  const pendingMountCheckRef = useRef(false);

  // Track dataset resets (filters/sort changes) so we can re-check a visible sentinel.
  const prevResetKeyRef = useRef(resetKey);
  const pendingResetCheckRef = useRef(false);

  // Mirror the prop ref into a local ref so linters don't flag `.current` reads
  // inside callbacks/effects (oxlint doesn't understand prop refs are stable).
  const scrollElRef = useRef<HTMLElement | null>(
    scrollContainerRef?.current ?? null,
  );
  useIsomorphicLayoutEffect(() => {
    scrollElRef.current = scrollContainerRef?.current ?? null;
  });

  const triggerLoadIfIntersecting = useCallback((): boolean => {
    if (isLoadingRef.current || statusRef.current !== 'CanLoadMore')
      return false;

    // Use sentinelElement (state) before the observer attaches
    const element = observedElementRef.current ?? sentinelElement;
    if (!element) return false;

    const rect = element.getBoundingClientRect();
    const container = scrollElRef.current;
    // When using a scroll container, compute intersection relative to it
    const visibleHeight = container
      ? container.clientHeight
      : window.innerHeight;
    const containerTop = container ? container.getBoundingClientRect().top : 0;
    // Match observer's rootMargin: trigger if within margin of visible area bottom
    const isIntersecting =
      rect.top - containerTop <= visibleHeight + marginRef.current;

    if (isIntersecting) {
      isLoadingRef.current = true;
      startTransition(() => {
        loadMoreFnRef.current(pageSizeRef.current);
      });
      return true;
    }
    return false;
  }, [sentinelElement]);

  // Keep refs in sync (avoids stale closures in observer callback)
  useIsomorphicLayoutEffect(() => {
    statusRef.current = status;
    loadMoreFnRef.current = loadMore;
  });

  // On mount, cache hits can start in CanLoadMore without a transition.
  useEffect(() => {
    if (!isFirstRenderRef.current) return;
    isFirstRenderRef.current = false;
    if (status === 'CanLoadMore') {
      pendingMountCheckRef.current = true;
    }
  }, [status]);

  // Reset loading guard and schedule a sentinel check when the dataset changes.
  useEffect(() => {
    if (prevResetKeyRef.current === resetKey) return;

    prevResetKeyRef.current = resetKey;
    pendingResetCheckRef.current = resetKey !== undefined;

    if (isLoadingRef.current) {
      isLoadingRef.current = false;
    }
  }, [resetKey]);

  // Handle scroll restoration: mount in CanLoadMore with the sentinel already above the viewport.
  // Avoid clearing the pending flag until we've checked with a real sentinel element.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!pendingMountCheckRef.current) return;

    let active = true;
    let rafId: number | null = null;
    let timeoutId: number | null = null;

    const listenTarget = scrollElRef.current ?? window;

    const stop = () => {
      if (!active) return;
      active = false;
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      listenTarget.removeEventListener('scroll', handleRestore);
      window.removeEventListener('resize', handleRestore);
    };

    const attemptMountCheck = (finalizeAfterCheck: boolean) => {
      if (!active) return;
      if (!pendingMountCheckRef.current) {
        stop();
        return;
      }
      if (statusRef.current !== 'CanLoadMore') {
        pendingMountCheckRef.current = false;
        stop();
        return;
      }

      const hasSentinel = Boolean(
        observedElementRef.current ?? sentinelElement,
      );
      if (!hasSentinel) return;

      const triggered = triggerLoadIfIntersecting();
      if (triggered || finalizeAfterCheck) {
        pendingMountCheckRef.current = false;
        stop();
      }
    };

    const handleRestore = () => {
      attemptMountCheck(true);
    };

    listenTarget.addEventListener('scroll', handleRestore, { passive: true });
    window.addEventListener('resize', handleRestore);

    rafId = window.requestAnimationFrame(() => {
      attemptMountCheck(false);
    });

    timeoutId = window.setTimeout(() => {
      attemptMountCheck(true);
    }, 1500);

    return stop;
  }, [triggerLoadIfIntersecting, sentinelElement]);

  // Handle edge case: sentinel was already in viewport before status became CanLoadMore,
  // or after a resetKey change (filters/sort toggles) with cached data.
  useEffect(() => {
    const isInitialTransition =
      prevStatusRef.current === 'LoadingFirstPage' && status === 'CanLoadMore';
    const shouldCheckAfterReset =
      pendingResetCheckRef.current && status === 'CanLoadMore';

    // Only trigger on LoadingFirstPage → CanLoadMore transition (initial load completion),
    // or on a resetKey change when cached data skips the loading state.
    if (
      (isInitialTransition || shouldCheckAfterReset) &&
      !isLoadingRef.current
    ) {
      triggerLoadIfIntersecting();
    }

    if (shouldCheckAfterReset && observedElementRef.current) {
      pendingResetCheckRef.current = false;
    }
  }, [status, resetKey, triggerLoadIfIntersecting]);

  // Update transition tracking and reset loading guard after pagination completes.
  useEffect(() => {
    // SAFETY VALVE:
    // If we reset to first page (or error on first page), clear loading guard.
    // This handles cases where a loadMore call was aborted (e.g. due to stale state)
    // and the status transitioned directly from CanLoadMore -> LoadingFirstPage
    // without ever hitting LoadingMore.
    if (status === 'LoadingFirstPage' || status === 'ErrorFirstPage') {
      isLoadingRef.current = false;
    }

    // Only reset loading guard when status actually transitions from LoadingMore
    // (not on every render where status happens to be CanLoadMore)
    if (prevStatusRef.current === 'LoadingMore' && status !== 'LoadingMore') {
      isLoadingRef.current = false;
      // After loading completes, re-check if sentinel is visible.
      // This handles the tab-switch case where component remounts with LoadingMore status
      // (pages reconnecting), then transitions to CanLoadMore, but sentinel was already visible.
      if (status === 'CanLoadMore') {
        triggerLoadIfIntersecting();
      }
    }
    prevStatusRef.current = status;
  });

  // Create observer ONCE on mount - never recreate to prevent scroll position loss.
  // scrollContainer is read from ref (not a dep) so observer isn't recreated if the
  // container ref stabilizes after mount — the ref value is captured at creation time.
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      entries => {
        // Use refs to get current values (avoids stale closure)
        if (
          entries[0].isIntersecting &&
          statusRef.current === 'CanLoadMore' &&
          !isLoadingRef.current
        ) {
          isLoadingRef.current = true;
          startTransition(() => {
            loadMoreFnRef.current(pageSizeRef.current);
          });
        }
      },
      {
        threshold: 0,
        rootMargin: `${marginRef.current}px 0px`,
        root: scrollElRef.current ?? undefined,
      },
    );

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, []); // Empty deps - observer created once on mount

  // Handle page visibility changes (mobile tab switch / app backgrounding)
  // Reset loading guard when returning to visible tab to prevent stuck pagination.
  //
  // We listen to multiple events because iOS Safari has bugs:
  // - visibilitychange: May NOT fire when using iOS Safari tab switcher (WebKit Bug 205942)
  // - focus: Fires when window regains focus, covers iOS Safari tab switcher
  // - pageshow: Fires when page is restored from bfcache
  //
  // Resetting the guard is always safe because loadMore() has its own status check
  // that prevents duplicate loads.
  useEffect(() => {
    if (typeof document === 'undefined') return; // SSR safety

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    function resetGuard(_source: string) {
      if (isLoadingRef.current) {
        isLoadingRef.current = false;
      }
    }

    function handleVisibilityChange() {
      if (!document.hidden) {
        resetGuard('visibilitychange');
      }
    }

    // iOS Safari workaround: tab switcher may not fire visibilitychange
    function handleFocus() {
      resetGuard('focus');
    }

    // Handle bfcache restoration (back/forward navigation)
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        resetGuard('pageshow');
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  // Re-observe when sentinelElement becomes available
  // Dependent on sentinelElement state, ensuring it runs whenever the DOM node attaches
  useEffect(() => {
    const element = sentinelElement;
    const observer = observerRef.current;

    // Skip if no element or no observer
    if (!element || !observer) return;

    // Skip if already observing this element
    if (observedElementRef.current === element) return;

    // Unobserve previous element if any
    if (observedElementRef.current) {
      observer.unobserve(observedElementRef.current);
    }

    // Observe new element
    observer.observe(element);
    observedElementRef.current = element;

    if (statusRef.current === 'CanLoadMore') {
      if (pendingResetCheckRef.current) {
        triggerLoadIfIntersecting();
        pendingResetCheckRef.current = false;
      }
      if (pendingMountCheckRef.current) {
        triggerLoadIfIntersecting();
        pendingMountCheckRef.current = false;
      }
    }
  }, [sentinelElement, triggerLoadIfIntersecting]);

  return { sentinelRef };
}
