/* eslint-disable @typescript-eslint/no-explicit-any */
import { type PaginationState } from '@/providers/pagination-state-provider';
import { convexQuery } from '@convex-dev/react-query';
import { useQueries } from '@tanstack/react-query';
import type {
  PaginatedQueryArgs,
  PaginatedQueryItem,
  PaginatedQueryReference,
  PaginationStatus,
} from 'convex/react';
import type { PaginationResult } from 'convex/server';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePaginationStateContext } from './use-pagination-state';

export function useConvexInfiniteQuery<Query extends PaginatedQueryReference>(
  query: Query,
  args: PaginatedQueryArgs<Query> | 'skip',
  options: { initialNumItems: number },
) {
  const { getState, setState: setContextState } = usePaginationStateContext();
  const skip = args === 'skip';
  const argsObject = useMemo(
    () => (skip ? {} : args) as Record<string, unknown>,
    [skip, args],
  );

  // Generate stable key for context lookup
  const stateKey = useMemo(() => {
    if (skip) return '';
    return JSON.stringify({
      query: (query as { _name?: string })._name || String(query),
      args: argsObject,
    });
  }, [query, argsObject, skip]);

  // Track args changes
  const argsRef = useRef(argsObject);
  const argsChanged =
    JSON.stringify(argsRef.current) !== JSON.stringify(argsObject);
  if (argsChanged) argsRef.current = argsObject;

  // Initialize from context or create fresh
  const [state, setLocalState] = useState<PaginationState>(() => {
    if (skip) return { nextPageKey: 1, pageKeys: [], queries: {} };
    const existingState = stateKey ? getState(stateKey) : undefined;
    if (existingState) return existingState;

    return {
      nextPageKey: 1,
      pageKeys: [0],
      queries: {
        0: {
          args: {
            ...argsObject,
            paginationOpts: { numItems: options.initialNumItems, cursor: null },
          },
        },
      },
    };
  });

  // Sync updates to context
  const setState = useCallback(
    (updater: (prev: PaginationState) => PaginationState) => {
      setLocalState(prev => {
        const newState = updater(prev);
        if (stateKey) setContextState(stateKey, newState);
        return newState;
      });
    },
    [stateKey, setContextState],
  );

  // Initial sync
  const initialSyncDone = useRef(false);
  useEffect(() => {
    if (!skip && stateKey && !initialSyncDone.current) {
      setContextState(stateKey, state);
      initialSyncDone.current = true;
    }
  }, [skip, stateKey, state, setContextState]);

  // Reset on args change
  useEffect(() => {
    if (skip || !argsChanged) return;
    const newState: PaginationState = {
      nextPageKey: 1,
      pageKeys: [0],
      queries: {
        0: {
          args: {
            ...argsObject,
            paginationOpts: { numItems: options.initialNumItems, cursor: null },
          },
        },
      },
    };
    setLocalState(newState);
    if (stateKey) setContextState(stateKey, newState);
  }, [
    argsChanged,
    skip,
    argsObject,
    options.initialNumItems,
    stateKey,
    setContextState,
  ]);

  // Build TQ queries
  const tanstackQueries = useMemo(
    () =>
      state.pageKeys.map(key => ({
        ...convexQuery(query, state.queries[key]?.args as any),
        enabled: !skip && !!state.queries[key],
        structuralSharing: false,
      })),
    [query, state.pageKeys, state.queries, skip],
  );

  const pageResults = useQueries({ queries: tanstackQueries as any });

  // Track updates
  const pageDataHash = useMemo(() => {
    return pageResults.map(r => r?.dataUpdatedAt || 0).join('|');
  }, [pageResults]);

  // Accumulate results
  const { results, status, lastPage } = useMemo(() => {
    const allItems: PaginatedQueryItem<Query>[] = [];
    const seenIds = new Set<string>();
    let lastResult: PaginationResult<PaginatedQueryItem<Query>> | undefined;
    let loadingStatus: PaginationStatus = 'LoadingFirstPage';

    for (let i = 0; i < pageResults.length; i++) {
      const pageQuery = pageResults[i];
      if (pageQuery?.isLoading || pageQuery?.data === undefined) {
        loadingStatus = i === 0 ? 'LoadingFirstPage' : 'LoadingMore';
        break;
      }

      const page = pageQuery.data as PaginationResult<
        PaginatedQueryItem<Query>
      >;
      lastResult = page;

      for (const item of page.page) {
        const id = (item as { _id?: string })._id;
        if (id && seenIds.has(id)) continue;
        if (id) seenIds.add(id);
        allItems.push(item);
      }

      loadingStatus = page.isDone ? 'Exhausted' : 'CanLoadMore';
    }

    return { results: allItems, status: loadingStatus, lastPage: lastResult };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageResults, pageDataHash]);

  // Load more
  const loadMore = useCallback(
    (numItems: number) => {
      if (status !== 'CanLoadMore' || !lastPage?.continueCursor) return;

      setState(prev => {
        const newKey = prev.nextPageKey;
        return {
          nextPageKey: newKey + 1,
          pageKeys: [...prev.pageKeys, newKey],
          queries: {
            ...prev.queries,
            [newKey]: {
              args: {
                ...argsObject,
                paginationOpts: { cursor: lastPage.continueCursor, numItems },
              },
            },
          },
        };
      });
    },
    [status, lastPage?.continueCursor, argsObject, setState],
  );

  return {
    results,
    status,
    loadMore: (numItems?: number) =>
      loadMore(numItems ?? options.initialNumItems),
    isLoading: status === 'LoadingFirstPage',
    isFetchingNextPage: status === 'LoadingMore',
    hasNextPage: status === 'CanLoadMore',
  };
}
