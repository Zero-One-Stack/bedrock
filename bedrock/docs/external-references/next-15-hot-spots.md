# Next.js 15+ App Router — the places the kit's rules intersect

**Verified against:** Next.js 15.x and 16.x (Apr 2026 docs). The patterns below are stable
across both majors unless noted. Always confirm the installed major in Recon
(`package.json`); Next.js's APIs shift between majors more than most React libraries.

## Async `params` and `searchParams` (Next 15 breaking change)

In **Next.js 14 and earlier**, `params` and `searchParams` were synchronous objects. **In
Next.js 15+ they are Promises**. Every page, layout, route handler, `generateMetadata`, and
`generateStaticParams` signature changed. This breaks every example written for Next 14.

```tsx
// app/grievance/[id]/page.tsx — Next 15+
export default async function GrievancePage(
  { params, searchParams }: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ filter?: string }>;
  }
) {
  const { id } = await params;
  const { filter } = await searchParams;
  // …
}
```

```tsx
// generateMetadata — same shape
export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  // …
}
```

```tsx
// generateStaticParams — returns plain array, no Promise on params
export async function generateStaticParams() {
  return [{ id: '1' }, { id: '2' }];
}
```

Migration codemod: `npx @next/codemod@latest next-async-request-api .` — applies the
Promise wrapping mechanically. Use it on existing v14 code.

## `generateMetadata` and React `cache()` (avoid 2× DB reads)

`generateMetadata` runs server-side and is **memoized only for `fetch` calls**. If your
metadata reads via a DB client / service client (not `fetch`), the same query runs twice:
once for metadata, once for the page render. Double-load.

The fix: wrap the read in React's `cache()`. Both calls hit one resolution.

```tsx
// pages/<route>/model/metadata.ts (per the kit's FSD layout)
import 'server-only';
import { cache } from 'react';
import type { Metadata } from 'next';
import { getGrievanceById } from '@/entities/grievance';

// React cache() memoizes within a single RSC render pass.
const getCachedGrievance = cache((id: string) => getGrievanceById(id));

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const g = await getCachedGrievance(id);
  return { title: g.title, description: g.summary };
}
```

The same `getCachedGrievance(id)` call from `page.tsx`'s body resolves to the cached value.

## You cannot export both `metadata` AND `generateMetadata` from the same segment

Next.js refuses to compile a route segment that exports both. Pick one. The kit's
`nextjs-app-router-fsd.md` rule documents this; the `agents-md-export` template repeats it.

## Route segment config lives in the route module ONLY

Next.js scans the route file (`page.tsx`, `route.ts`, `layout.tsx`) for `runtime`, `dynamic`,
`maxDuration`, `revalidate`, `fetchCache`. **Re-exports don't propagate.** This is the most
common silent-failure source when a project uses thin re-exports per FSD.

```ts
// app/api/stripe/webhook/route.ts — config MUST be inlined here.
export { POST } from '@/shared/api/webhooks/stripe.handler';
export const runtime = 'nodejs';        // ← scanned here, not in the handler module
export const maxDuration = 60;          // ← same
```

## `default.tsx` is required in every parallel-route slot

For a parallel route at `app/<route>/@slot/page.tsx`, hard navigations and direct refreshes
fail with **"No default component was found for parallel route"** unless `default.tsx`
exists in the slot folder. The widget-as-slot pattern doesn't satisfy this — the file must
physically exist alongside `page.tsx`.

```tsx
// app/active-grievances/@modal/default.tsx — REQUIRED.
export { GrievanceDetailModalDefault as default } from '@/widgets/grievance-detail-modal';
```

## `error.tsx` and `global-error.tsx` must contain `'use client'` themselves

Next.js statically reads the route file itself for the `'use client'` directive. A directive
on a re-exported source module **does not propagate**. Error files must be inlined at the
root with `'use client'` at the top.

```tsx
// app/<route>/error.tsx — inline, 'use client' at the top
'use client';
import { useEffect } from 'react';
import { ActiveGrievancesErrorView } from '@/pages/active-grievances/routing';
import { captureException } from '@/shared/lib/observability';

export default function Error({ error, reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => { captureException(error); }, [error]);
  return <ActiveGrievancesErrorView error={error} onRetry={reset} />;
}
```

`global-error.tsx` follows the same pattern AND must render its own `<html>`/`<body>` AND
must NOT import the root layout's providers (which may be the source of the crash).

## `<html suppressHydrationWarning>` is mandatory when a theme script mutates `<html>`

The kit's theming pattern (`theming.md`) sets `data-theme` on `<html>` before hydration via
an inline script. Without `suppressHydrationWarning`, every page load logs a hydration
warning because the server-rendered DOM and client snapshot differ.

```tsx
// app/layout.tsx
return (
  <html lang="en" dir="ltr" data-theme={initialTheme} suppressHydrationWarning>
    {/* … */}
  </html>
);
```

## Don't use `<Script strategy="beforeInteractive">` for a theme-init inline script

There's an open Next.js bug (vercel/next.js#51242) where `<Script>` with
`beforeInteractive` and JSX-child inline content causes hydration errors in App Router. Use
a raw `<script dangerouslySetInnerHTML={{ __html: '…' }}>` with a static string literal
instead — that's what `next-themes` does internally. The kit's `theming.md` documents both
patterns.

## `cookies()`, `headers()`, `draftMode()` are all async in Next 15+

```tsx
import { cookies, headers, draftMode } from 'next/headers';

const cookieStore = await cookies();       // async in 15+
const headersList = await headers();        // async
const { isEnabled } = await draftMode();    // async
```

## Sources

- [Next.js 15 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-15)
- [Async Request APIs (RFC)](https://github.com/vercel/next.js/discussions/68227)
- [React `cache()`](https://react.dev/reference/react/cache)
- [Parallel Routes `default.js`](https://nextjs.org/docs/app/api-reference/file-conventions/default)
- [vercel/next.js#51242 — `<Script>` `beforeInteractive` hydration bug](https://github.com/vercel/next.js/issues/51242)
