/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ApiPaginatedReturn,
  ApiReturn,
  PaginatedQueryResult,
  PaginatedQueryStatus,
} from '@/types';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useConvex } from 'convex/react';
import { FunctionReference } from 'convex/server';
import { useMemo } from 'react';

/**
 * Configuration constants for query caching and refetching
 */
const QUERY_CONFIG = {
  STALE_TIME: 5 * 60 * 1000, // 5 minutes
  GC_TIME: 10 * 60 * 1000, // 10 minutes
} as const;

/**
 * Arguments type for the paginated query hook
 */
interface UsePaginatedQueryOptions {
  /** Initial number of items to fetch per page */
  initialNumItems: number;
}

/**
 * Custom hook for executing paginated Convex queries with infinite scroll support
 *
 * @template T - The Convex query function reference type
 * @param query - The Convex query function to execute
 * @param args - Query arguments (excluding paginationOpts)
 * @param options - Configuration options for pagination
 * @returns Paginated query result with status and load more functionality
 *
 * @example
 * ```typescript
 * const { results, status, loadMore } = usePaginatedQuery(
 *   api.messages.list,
 *   { channelId: '123' },
 *   { initialNumItems: 50 }
 * );
 * ```
 */
export function usePaginatedQuery<
  T extends FunctionReference<
    'query',
    'public',
    any,
    { page: readonly any[]; isDone: boolean; continueCursor: string }
  >,
>(
  query: T,
  args: Omit<Parameters<T>[0], 'paginationOpts'>,
  options: UsePaginatedQueryOptions,
): PaginatedQueryResult<ApiPaginatedReturn<T>> {
  const convex = useConvex();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: [query, args] as const,
    queryFn: async ({ pageParam }) => {
      type QueryArgs = Parameters<T>[0];
      type QueryReturn = ApiReturn<T>;

      const queryArgs = {
        ...args,
        paginationOpts: {
          numItems: options.initialNumItems,
          cursor: pageParam,
        },
      } as QueryArgs;

      const result = await convex.query(query, queryArgs);

      return result as QueryReturn;
    },
    getNextPageParam: lastPage => {
      type QueryReturn = ApiReturn<T>;
      const typedLastPage = lastPage as QueryReturn;

      // Return undefined to signal no more pages available
      if (typedLastPage.isDone) {
        return undefined;
      }

      return typedLastPage.continueCursor;
    },
    initialPageParam: null as string | null,
    staleTime: QUERY_CONFIG.STALE_TIME,
    gcTime: QUERY_CONFIG.GC_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  /**
   * Flatten all pages into a single array of results
   * Memoized to prevent unnecessary recalculations
   */
  const results = useMemo(() => {
    if (!data?.pages) {
      return [];
    }

    return data.pages.flatMap(page => {
      type QueryReturn = ApiReturn<T>;
      const typedPage = page as QueryReturn;
      return typedPage.page;
    });
  }, [data]);

  /**
   * Determine the current pagination status
   */
  const status: PaginatedQueryStatus = useMemo(() => {
    if (isLoading) {
      return 'LoadingFirstPage';
    }
    if (isFetchingNextPage) {
      return 'LoadingMore';
    }
    if (hasNextPage) {
      return 'CanLoadMore';
    }
    return 'Exhausted';
  }, [isLoading, isFetchingNextPage, hasNextPage]);

  /**
   * Handle errors gracefully by logging them
   * Can be extended to show user-facing error messages
   */
  if (error) {
    console.error('Paginated query error:', error);
  }

  return {
    results,
    status,
    isLoading,
    isFetchingNextPage,
    hasNextPage: hasNextPage ?? false,
    loadMore: fetchNextPage,
  };
}
