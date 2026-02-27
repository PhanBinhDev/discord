'use client';

import { useAuth } from '@clerk/nextjs';
import { ConvexQueryClient } from '@convex-dev/react-query';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConvexQueryCacheProvider } from 'convex-helpers/react/cache';
import { ConvexReactClient } from 'convex/react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { useState } from 'react';
import { PaginationStateProvider } from './pagination-state-provider';

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error('NEXT_PUBLIC_CONVEX_URL is not defined');
}

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: IChildren) {
  const [queryClient] = useState(() => {
    const convexQueryClient = new ConvexQueryClient(convex);
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          queryKeyHashFn: convexQueryClient.hashFn(),
          queryFn: convexQueryClient.queryFn(),
        },
      },
    });
    convexQueryClient.connect(client);
    return client;
  });

  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <QueryClientProvider client={queryClient}>
        <PaginationStateProvider>
          <ConvexQueryCacheProvider>{children}</ConvexQueryCacheProvider>
        </PaginationStateProvider>
      </QueryClientProvider>
    </ConvexProviderWithClerk>
  );
}
