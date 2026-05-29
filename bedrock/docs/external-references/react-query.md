# TanStack React Query — the kit's patterns

**Verified against:** `@tanstack/react-query@5.x` (latest at 2026-05). v5 is the current
major; v4 is materially different (different cache APIs, no `suspense` option on
`useQuery`). Verify the installed major in Recon.

## QueryClient setup (the canonical Provider, used by `src/app/providers/query.tsx`)

```tsx
'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';

export function QueryProvider({ children }: { children: ReactNode }) {
  // useState ensures one QueryClient per browser session (not one per render).
  // The kit's provider tree (feature-sliced-design.md → Provider composition root)
  // already lives inside a 'use client' shell, so useState here is safe.
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,                  // 30s — stops the refetch-on-mount thrash
        gcTime: 5 * 60_000,                 // 5min — gcTime (v5) replaces v4's cacheTime
        retry: 1,
        refetchOnWindowFocus: false,
        // throwOnError: true               // opt-in: turns errors into Error Boundary
      },
      mutations: { retry: 0 },
    },
  }));

  return (
    <QueryClientProvider client={client}>
      {children}
      {process.env.NODE_ENV !== 'production' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
```

Provider placement: per `feature-sliced-design.md`'s "Provider composition root", `QueryProvider`
sits between `ThemeProvider` and `I18nProvider`. Wrong order breaks Auth's token refresh
(which uses Query) or breaks query hydration of RSC-prefetched data.

## RSC hydration — pass `dehydratedState` from server to client

The page (Server Component) prefetches into a temporary QueryClient, dehydrates the cache,
and passes it through a `<HydrationBoundary>` so the client picks up the data without a
second fetch.

```tsx
// pages/<route>/ui/<Route>Page.tsx — RSC
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { GrievanceList } from '@/widgets/grievance-list';
import { listGrievances } from '@/entities/grievance';

export async function ActiveGrievancesPage() {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: ['grievance', 'list'],
    queryFn: listGrievances,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <GrievanceList />
    </HydrationBoundary>
  );
}
```

Inside `<GrievanceList />` (client), `useGrievances()` resolves to the prefetched data
instantly — no loading state, no second network call.

## Query key naming (the kit's stable convention)

Query keys are exported from the entity's `<model>.hooks.ts` so consumers reference the
same tuple. Avoid string-typed keys; use a const object.

```ts
// entities/grievance/api/grievance.hooks.ts
export const grievanceKeys = {
  all:    ['grievance'] as const,
  lists:  () => [...grievanceKeys.all, 'list'] as const,
  list:   (filter?: string) => [...grievanceKeys.lists(), { filter }] as const,
  details: () => [...grievanceKeys.all, 'detail'] as const,
  detail: (id: string) => [...grievanceKeys.details(), id] as const,
};
```

## `useQuery` (client read)

```tsx
'use client';
import { useQuery } from '@tanstack/react-query';
import { fetchGrievances } from './grievance.api';
import { grievanceKeys } from './grievance.hooks';

export function useGrievances(filter?: string) {
  return useQuery({
    queryKey: grievanceKeys.list(filter),
    queryFn: () => fetchGrievances({ filter }),
    // staleTime override per-query is fine; defaults come from QueryClient
  });
}
```

## `useMutation` + invalidate (the kit's feature-write pattern)

The feature's Server Action does the actual write (per `services-and-data.md`). The
client-side mutation hook wraps it and invalidates the affected query keys on success so
the client cache stays consistent without a full re-render of the page.

```tsx
// features/file-grievance/model/use-file-grievance.ts
'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fileGrievance } from '../api/file-grievance.action';
import { grievanceKeys } from '@/entities/grievance';

export function useFileGrievanceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fileGrievance,                   // the Server Action
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: grievanceKeys.all });
    },
  });
}
```

> **`revalidatePath` vs `invalidateQueries`.** For RSC-fetched pages, `revalidatePath`
> (from the Server Action) re-fetches the page on the server. For client-only consumers
> of `useQuery`, `invalidateQueries` is needed. Most features want **both** — Server
> Action calls `revalidatePath`, and the client-side mutation hook invalidates the keys.

## v5 vs v4 — the changes the kit cares about

| Concept | v4 | v5 |
| --- | --- | --- |
| Cache time | `cacheTime` | `gcTime` |
| Error throwing | `useErrorBoundary` | `throwOnError` |
| `useQueries` array | `queries: [{ … }]` | same, but `combine` is now a top-level option |
| Suspense | `useQuery({ suspense: true })` | `useSuspenseQuery()` (separate hook) |
| `keepPreviousData` | `keepPreviousData: true` | `placeholderData: keepPreviousData` from `@tanstack/react-query` |
| `onSuccess`/`onError` on `useQuery` | supported | **removed** — use `useEffect` on `data`/`error` instead |

The `onSuccess`/`onError` removal trips up most v4 → v5 migrations. The kit's pattern
(mutation `onSuccess` for invalidation, no query `onSuccess`) is already v5-shaped.

## Sources

- [TanStack React Query docs](https://tanstack.com/query/latest)
- [v5 migration guide](https://tanstack.com/query/v5/docs/framework/react/guides/migrating-to-v5)
- [Advanced Server Rendering (HydrationBoundary)](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr)
