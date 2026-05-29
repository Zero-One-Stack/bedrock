# Rule: Next.js App Router primitives in FSD

> **Non-negotiable.** Every Next.js App Router file under root `app/` is either a **thin re-export**
> of an FSD slice OR — for files where Next's compiler statically reads the source file itself
> (`error.tsx`, `global-error.tsx`, `not-found.tsx`, `template.tsx`, `default.tsx`,
> `opengraph-image.tsx`, `icon.tsx`, route-segment config in `route.ts`) — an **inline
> implementation** that delegates to FSD slices for any logic that runs *inside* the component.
> Never business logic, layout styling, or `fetch` inside a routing file's logic.
> Placement of *components* is governed by `feature-sliced-design.md`; placement of *data* by
> `services-and-data.md`. This rule covers the Next-specific pieces those two don't name.

## Why this exists

The App Router introduced a dozen file-name conventions (`layout.tsx`, `page.tsx`, `error.tsx`,
`not-found.tsx`, `loading.tsx`, `route.ts`, `middleware.ts`, `default.tsx`, `template.tsx`,
`opengraph-image.tsx`, `sitemap.ts`, `robots.ts`, `manifest.ts`, parallel routes `@slot/`,
intercepting routes `(.)`, route groups `(group)`, `generateMetadata`, `generateStaticParams`)
that aren't named in the FSD spec — because FSD predates them. Without a rule, each one drifts.
This rule pins each primitive to a slice/segment, distinguishes **re-exportable** files from
**Next-static-analyzed** files, and shows the one-line template for each.

## Re-exportable vs static-analyzed (the critical distinction)

Next.js's compiler statically reads certain files for **directives, named exports, and special
exports** that change how the file is treated. Re-exporting those from another module **does not
propagate the directive/export back to the route file** — Next only inspects the route file
itself. So:

- ✅ **Re-exportable (the kit's default)** — Next.js treats these files as normal modules. A
  one-line `export { … as default } from '@/...';` works.
  - `app/layout.tsx`, `app/<route>/layout.tsx`
  - `app/page.tsx`, `app/<route>/page.tsx`
  - `app/<route>/loading.tsx`
  - `app/<route>/route.ts` (handler body re-exports; **route segment config stays in the root**)
  - `middleware.ts`, `instrumentation.ts`
  - `app/sitemap.ts`, `app/robots.ts`, `app/manifest.ts`
- ⚠️ **Statically analyzed — directives/exports must be in the root file itself.** Inline the
  implementation in the root `app/` file (delegating business logic to FSD slices, but **the
  component, the `'use client'` directive, route-segment config, and the special named exports
  live in the root**):
  - `app/error.tsx`, `app/<route>/error.tsx`, `app/global-error.tsx` — must start with
    `'use client'`; the directive does not propagate through re-export.
  - `app/<route>/not-found.tsx`, `app/<route>/default.tsx`, `app/<route>/template.tsx` — often
    fine as re-exports, but if they need `'use client'`, the directive lives in the root.
  - `app/<route>/opengraph-image.tsx`, `app/<route>/icon.tsx`, `app/<route>/twitter-image.tsx`,
    `app/<route>/apple-icon.tsx` — the named exports (`alt`, `size`, `contentType`) and the
    default function are read from the route file.
  - **Route segment config** (`export const runtime`, `export const dynamic`, `export const
    maxDuration`, `export const revalidate`, `export const fetchCache`) — Next only scans the
    route module. Declare these in the root `app/<route>/{page,layout,route}.tsx|ts`, never in
    a re-exported source.

## The placement table (every primitive → its FSD home)

| App Router primitive | Where the logic lives (FSD) | What sits at the root `app/` path |
| --- | --- | --- |
| `app/layout.tsx` (root layout) | Providers in `src/app/providers/` (a `'use client'` shell); global styles in `src/app/styles/`. The root layout is a **Server Component** that only injects `next/font`, `tokens.css`, and renders `<Providers>`. | One-line `import { Providers } from '@/app/providers';` + `<html><body><Providers>{children}</Providers></body></html>`. No layout CSS. |
| `app/<route>/layout.tsx` (nested layout) | The composed widget(s) live in `widgets/<block>/`. The Next layout file composes them — nothing else. | `export { ActiveGrievancesLayout as default } from '@/pages/active-grievances/routing';` — through the slice's **public-API barrel**, never a deep `ui/` path. |
| `app/<route>/page.tsx` (route screen) | `src/pages/<route>/ui/<Route>Page.tsx` (an RSC composing widgets/features/entity UI). | `export { ActiveGrievancesPage as default } from '@/pages/active-grievances/routing';` |
| `app/<route>/loading.tsx` | `src/pages/<route>/ui/<Route>Loading.tsx` — a skeleton/spinner composed from `shared/ui` atoms. | `export { ActiveGrievancesLoading as default } from '@/pages/active-grievances/routing';` |
| `app/<route>/error.tsx` | **Inline in the root file** (statically analyzed); delegates to `src/pages/<route>/ui/<Route>ErrorView.tsx` for the actual UI. Logging via `shared/lib/observability`. | See template below — `'use client';` on line 1, minimal component, calls `<ActiveGrievancesErrorView />`. |
| `app/<route>/not-found.tsx` | `src/pages/<route>/ui/<Route>NotFound.tsx`. If purely presentational, re-export. If interactive, inline `'use client'` + delegate. | `export { ActiveGrievancesNotFound as default } from '@/pages/active-grievances/routing';` |
| `app/global-error.tsx` | **Inline at root** — must render its own `<html>`/`<body>`, must be a Client Component, **must NOT depend on the root layout's providers**. UI delegates to `src/widgets/global-error-view/` (a widget composing `shared/ui` atoms only — no Providers import, so the fallback survives provider crashes). | See template below — `'use client';` + `<html><body><GlobalErrorView … /></body></html>`. |
| `app/<route>/template.tsx` (re-mount per nav) | The component lives in `src/pages/<route>/ui/<Route>Template.tsx`. | `export { ActiveGrievancesTemplate as default } from '@/pages/active-grievances/routing';` |
| `app/<route>/default.tsx` (parallel-route fallback) | `src/pages/<route>/ui/<Route>Default.tsx`. **Required** in every parallel-route slot for hard navigations to render — see Parallel Routes section. | `export { ActiveGrievancesDefault as default } from '@/pages/active-grievances/routing';` |
| `app/<route>/route.ts` (Route Handler) | **Default policy:** UI-driven mutations belong in a feature **Server Action**. Use a Route Handler when you genuinely need one of: webhooks / OAuth callbacks, 3rd-party signed-URL or stream proxies, public JSON APIs consumed by external clients, or streamed request bodies (multipart upload). Handler body in `shared/api/webhooks/<name>.handler.ts` (webhooks) or `shared/api/public/<name>.handler.ts` (public APIs). | Handler re-exported, **route segment config inlined at the root** (see template). |
| `app/<route>/page.tsx` `export const metadata` (static) | `src/pages/<route>/model/metadata.ts`. **Mutually exclusive with `generateMetadata`** (Next.js rejects exporting both from the same segment). | `export { metadata } from '@/pages/active-grievances/routing';` (alongside `default`). |
| `app/<route>/page.tsx` `export async function generateMetadata` | `src/pages/<route>/model/metadata.ts`. Reads via entity `*.queries.ts` **wrapped in React `cache()`** — Next memoizes only `fetch`; non-`fetch` reads (DB/service client) double-execute between `generateMetadata` and the page render unless `cache()`-wrapped. | `export { generateMetadata } from '@/pages/active-grievances/routing';` (alongside `default`). |
| `app/<route>/page.tsx` `export async function generateStaticParams` | `src/pages/<route>/model/static-params.ts`. | `export { generateStaticParams } from '@/pages/active-grievances/routing';` (alongside `default`). |
| `app/<route>/opengraph-image.tsx` / `twitter-image.tsx` | **Inline at root** (named exports + default are statically read); the `ImageResponse` JSX delegates to `<RouteOgImageView />` in `src/pages/<route>/ui/`. | See template — `export const alt/size/contentType` + `export default async function Image()` at the root. |
| `app/<route>/icon.tsx` / `apple-icon.tsx` | **Inline at root** (same reason as OG image). The visual delegates to the kit's canonical `Icon` atom (`shared/ui` per `component-structure.md`, either flat or via the atomic sub-convention `shared/ui/atoms/icon/`) or a per-route view in `src/pages/<route>/ui/`. The Satori carve-out applies — inline `style={{}}` only, no `.module.css`. | See template — `export const size/contentType` + `export default function …()` at the root. |
| `app/sitemap.ts` | `src/app/model/sitemap.ts` — the FSD **app layer**'s `model/` segment. App-wide metadata files (sitemap/robots/manifest) are the documented exception to "no business logic in app": they aggregate URLs across multiple entities, don't belong to any single route or widget, and FSD's import-direction rule already allows `app` to import from `entities/` (top imports everything below). | `export { default } from '@/app/sitemap';` |
| `app/robots.ts` | `src/app/model/robots.ts` (or inline at the root file if no domain logic). | `export { default } from '@/app/robots';` |
| `app/manifest.ts` (PWA) | `src/app/model/manifest.ts`. | `export { default } from '@/app/manifest';` |
| `middleware.ts` (repo root, NOT inside `app/`) | `src/shared/lib/middleware/` — composable matchers + handlers (auth, locale, A/B). Middleware runs before any FSD layer is materialized, so it must import only from `shared/`. | `export { middleware, config } from '@/shared/lib/middleware';` |
| `instrumentation.ts` (repo root) | `src/shared/lib/instrumentation/` (or a dedicated `widgets/instrumentation/` if it needs entity reads). **Never** `src/instrumentation.ts` or `src/app/instrumentation.ts` — Next.js also scans those paths and may load instrumentation twice. | `export { register } from '@/shared/lib/instrumentation';` |
| Route groups `app/(marketing)/...` | Group folders **carry no FSD meaning** — they only organize routes. Their pages still live in `src/pages/<route>/` named by the URL, not the group. | Same per-route re-exports as above. |
| Parallel route slot `app/<route>/@modal/...` | Each slot is a **widget** that may have its own pages. The slot's pages live in `src/widgets/<modal>/ui/` (RSC + a `<Modal>Default` export for empty-slot fallback). | `app/<route>/@modal/page.tsx` re-exports the slot screen; **`app/<route>/@modal/default.tsx` MUST physically exist** (Next requirement) and re-exports the empty-slot view. |
| Intercepting route `app/<route>/(.)<intercepted>/page.tsx` | The intercepting screen is a **widget** (it's a mini-page rendered inside the active route). Lives in `src/widgets/<intercepted-modal>/ui/`. The intercepted route's own page stays where it was for direct/refresh navigation. | `export { default } from '@/widgets/<intercepted-modal>';` |

## Routes, screens, and segments — the singular-unit test (Next-flavored)

```
Is it the URL ↔ component binding?                       → root app/<route>/page.tsx (thin re-export)
Is it a route's main screen?                             → src/pages/<route>/ui/<Route>Page.tsx
Is it the route's loading UI?                            → src/pages/<route>/ui/<Route>Loading.tsx
Is it the route's error UI?                              → INLINE in app/<route>/error.tsx ('use client'), delegates to <Route>ErrorView in the page slice
Is it the route's not-found UI?                          → src/pages/<route>/ui/<Route>NotFound.tsx
Is it route metadata (static)?                           → src/pages/<route>/model/metadata.ts (mutually exclusive with generateMetadata)
Is it dynamic metadata / static params?                  → src/pages/<route>/model/{metadata,static-params}.ts — wrap entity reads in React cache()
Is it a self-contained block of the route?               → src/widgets/<block>/
Is it a parallel-route slot OR an intercepting page?     → src/widgets/<slot|modal>/
Is it a webhook / OAuth callback / 3rd-party proxy?      → src/shared/api/webhooks/<name>.handler.ts
Is it a public JSON API for 3rd-party clients?           → src/shared/api/public/<name>.handler.ts
Is it a UI-driven mutation?                              → feature Server Action (services-and-data.md), NOT a Route Handler
Is it auth/redirect/locale/A-B middleware?               → src/shared/lib/middleware/ (root middleware.ts re-exports)
Is it sitemap/robots/manifest?                           → src/app/model/<sitemap|robots|manifest>.ts (app-layer carve-out)
Is it global error / instrumentation?                    → global-error INLINE; instrumentation in src/shared/lib/instrumentation/
Is it an OG image / icon / favicon?                      → INLINE in the root app/.../<image>.tsx (delegates JSX to a view component)
Is it route segment config (runtime/dynamic/maxDuration)? → INLINE in the route's root file (Next ignores it elsewhere)
```

## Templates

### Root `app/layout.tsx` — providers in, layout styling out

```tsx
// app/layout.tsx — Server Component. Imports the FSD app-layer providers shell.
import type { Metadata } from 'next';
import { Providers } from '@/app/providers';   // FSD app layer — the 'use client' shell
import '@/app/styles/globals.css';               // generated tokens.css is imported from globals.css

export const metadata: Metadata = { title: { default: 'App', template: '%s · App' } };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### `app/<route>/page.tsx` — thin re-export (default + at most ONE of `metadata`/`generateMetadata`)

```tsx
// app/active-grievances/page.tsx — zero logic. Hook-blocked if it contains 'use client'.
export { ActiveGrievancesPage as default } from '@/pages/active-grievances/routing';

// Either static metadata:
export { metadata } from '@/pages/active-grievances/routing';
// …OR dynamic metadata + static params (never both `metadata` and `generateMetadata`):
// export { generateMetadata, generateStaticParams } from '@/pages/active-grievances/routing';

// Route segment config — inlined here, not in the slice (Next.js scans the route module only):
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
```

### `app/<route>/loading.tsx`

```tsx
export { ActiveGrievancesLoading as default } from '@/pages/active-grievances/routing';
```

### `app/<route>/error.tsx` — INLINE (`'use client'` is statically required)

```tsx
// app/active-grievances/error.tsx — Next reads this file for the directive.
'use client';
import { useEffect } from 'react';
import { ActiveGrievancesErrorView } from '@/pages/active-grievances/routing';
import { captureException } from '@/shared/lib/observability';   // see observability.md (Sentry wrapper)

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { captureException(error); }, [error]);
  return <ActiveGrievancesErrorView error={error} onRetry={reset} />;
}
```

### `app/global-error.tsx` — INLINE, renders its own `<html>`/`<body>`, NO providers

```tsx
// app/global-error.tsx — replaces the root layout. MUST NOT import the providers
// (the providers may BE the source of the crash). Compose from shared/ui atoms only.
'use client';
import { useEffect } from 'react';
import { GlobalErrorView } from '@/widgets/global-error-view';   // shared/ui-only widget
import { captureException } from '@/shared/lib/observability';   // see observability.md (Sentry wrapper)

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { captureException(error, { level: 'fatal' }); }, [error]);
  return (
    <html>
      <body>
        <GlobalErrorView onRetry={reset} />
      </body>
    </html>
  );
}
```

### `app/<route>/not-found.tsx`

```tsx
export { ActiveGrievancesNotFound as default } from '@/pages/active-grievances/routing';
```

### Page slice layout — what goes where

```
src/pages/active-grievances/
├── ui/
│   ├── ActiveGrievancesPage.tsx       # the RSC screen (composes widgets/features)
│   ├── ActiveGrievancesLayout.tsx     # optional — nested layout component
│   ├── ActiveGrievancesLoading.tsx    # skeleton from shared/ui atoms
│   ├── ActiveGrievancesErrorView.tsx  # the error UI body — pure presentational ('use client')
│   ├── ActiveGrievancesNotFound.tsx
│   ├── ActiveGrievancesTemplate.tsx   # optional — re-mount component
│   ├── ActiveGrievancesDefault.tsx    # optional — parallel-route default
│   └── ActiveGrievancesOgImageView.tsx # JSX for the OG ImageResponse (imported by the root file)
├── model/
│   ├── metadata.ts                    # EITHER `export const metadata` OR `generateMetadata` — wrap entity reads in cache()
│   └── static-params.ts               # generateStaticParams (also cache()-wrapped if it reads non-fetch sources)
├── api/                                # optional — page-private composers; entity *.queries.ts stays in entities/
├── index.ts                            # public API — the SCREEN consumed by other slices (rare; usually just <Route>Page)
└── routing.ts                          # routing-shell barrel — consumed ONLY by the root app/<route>/ files
```

### Two barrels: `index.ts` (public API) + `routing.ts` (Next.js routing shell)

A page slice has two distinct audiences:

1. **Other FSD slices** rarely import from a page (composition usually flows the other way). When
   they do — e.g. a widget rendering a thumbnail of the page screen — they import the slice's
   real **public API** via `index.ts`. Keep this surface **small**: typically `<Route>Page` and
   any genuinely reusable presentational piece. Most internals (Loading skeletons, ErrorView,
   OgImageView, Template, Default) stay **internal**.
2. **The root `app/<route>/` Next.js files** need a whole zoo of routing-shell exports
   (`<Route>Page`, `<Route>Loading`, `<Route>NotFound`, `<Route>ErrorView`, `<Route>Template`,
   `<Route>Default`, `<Route>OgImageView`, `metadata`/`generateMetadata`/`generateStaticParams`).
   These are imports the rest of the codebase must never use — they are the slice's *routing
   shell*, not its public API.

A dedicated `routing.ts` barrel separates the two so the slice's `index.ts` stays minimal and the
public-API isolation invariant holds. The root `app/<route>/*` files **always import from
`@/pages/<route>/routing`**; other FSD code **never** does.

```ts
// src/pages/active-grievances/routing.ts — routing-shell only. Off-limits to non-routing imports.
export { ActiveGrievancesPage } from './ui/ActiveGrievancesPage';
export { ActiveGrievancesLayout } from './ui/ActiveGrievancesLayout';
export { ActiveGrievancesLoading } from './ui/ActiveGrievancesLoading';
export { ActiveGrievancesNotFound } from './ui/ActiveGrievancesNotFound';
export { ActiveGrievancesErrorView } from './ui/ActiveGrievancesErrorView';
export { ActiveGrievancesTemplate } from './ui/ActiveGrievancesTemplate';
export { ActiveGrievancesDefault } from './ui/ActiveGrievancesDefault';
export { ActiveGrievancesOgImageView } from './ui/ActiveGrievancesOgImageView';
export { metadata, generateMetadata } from './model/metadata';
export { generateStaticParams } from './model/static-params';
```

```ts
// src/pages/active-grievances/index.ts — the genuine public API (small).
export { ActiveGrievancesPage } from './ui/ActiveGrievancesPage';   // usually just this
// Add other widely-reused exports here ONLY when a non-routing consumer needs them.
```

Steiger / dependency-cruiser should treat `pages/<route>/routing` as importable **only** from
`app/**` (the routing root). The `@x` notation does not apply here — `routing.ts` is the
sanctioned per-slice escape hatch for the Next.js routing layer.

### `pages/<route>/model/metadata.ts` — cache the entity read

```ts
// src/pages/active-grievances/model/metadata.ts
import 'server-only';
import { cache } from 'react';
import type { Metadata } from 'next';
import { getGrievanceById } from '@/entities/grievance';   // server-only entity query

// React cache() memoizes within the same RSC render pass — generateMetadata and the page
// both call this, but the entity is only read once.
const getCachedGrievance = cache((id: string) => getGrievanceById(id));

// Next.js 15+: `params` (and `searchParams`) are Promises. Always await them.
// The same Promise shape applies to page components, generateStaticParams, layouts, etc.
export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const g = await getCachedGrievance(id);
  return { title: g.title, description: g.summary };
}
```

### `app/<route>/route.ts` — handler re-export + segment config inline

```ts
// app/api/stripe/webhook/route.ts
export { POST } from '@/shared/api/webhooks/stripe.handler';

// Route segment config — must live HERE, not in the handler module (Next scans the route file only):
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
```

```ts
// src/shared/api/webhooks/stripe.handler.ts
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  // verify signature, parse with Zod, hand off to a feature/entity service
  return NextResponse.json({ ok: true });
}
```

### `middleware.ts` (repo root) — compose, don't author

```ts
// middleware.ts — at the repo root, never under app/
export { middleware, config } from '@/shared/lib/middleware';
```

```ts
// src/shared/lib/middleware/index.ts
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from './auth';
import { localeMiddleware } from './locale';

export function middleware(req: NextRequest) {
  const r = authMiddleware(req); if (r) return r;
  return localeMiddleware(req) ?? NextResponse.next();
}
export const config = { matcher: ['/((?!_next|api/health).*)'] };
```

### `instrumentation.ts` — at repo root only

```ts
// instrumentation.ts (repo root) — re-export from shared/lib, NOT from src/instrumentation.ts
// or src/app/instrumentation.ts (Next also scans those locations and will register twice).
export { register } from '@/shared/lib/instrumentation';
```

### Parallel routes — slot widget + REQUIRED `default.tsx`

```tsx
// app/active-grievances/@modal/page.tsx — the slot's content is a widget
export { GrievanceDetailModal as default } from '@/widgets/grievance-detail-modal';

// app/active-grievances/@modal/default.tsx — REQUIRED. Without this file, hard nav / refresh
// to /active-grievances throws "No default component was found for parallel route".
export { GrievanceDetailModalDefault as default } from '@/widgets/grievance-detail-modal';
```

### Intercepting routes — `app/feed/(.)photo/[id]/page.tsx`

```tsx
// Intercepts /photo/[id] inside the /feed route as a modal-like widget.
// The intercepted full page at app/photo/[id]/page.tsx stays as-is for direct/refresh nav.
export { PhotoModal as default } from '@/widgets/photo-modal';
```

### `sitemap.ts` — app-layer model file (the carve-out)

```ts
// app/sitemap.ts
export { default } from '@/app/sitemap';
```

```ts
// src/app/model/sitemap.ts — app-layer carve-out. App is the only FSD layer that can legitimately
// aggregate URLs across domains (top of the import hierarchy → imports any entity freely).
// Re-exported by src/app/index.ts as `sitemap`, or by a dedicated src/app/sitemap.ts barrel.
import 'server-only';
import { cache } from 'react';
import type { MetadataRoute } from 'next';
import { listGrievanceSlugs } from '@/entities/grievance';

const getSlugs = cache(() => listGrievanceSlugs());

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await getSlugs();
  return [
    { url: 'https://example.com/', lastModified: new Date() },
    ...slugs.map((s) => ({ url: `https://example.com/grievances/${s}`, lastModified: new Date() })),
  ];
}
```

### `app/<route>/opengraph-image.tsx` — INLINE (named exports are statically read)

> **next/og uses Satori, NOT the app's CSS pipeline.** Satori only understands a small subset of
> inline `style={{}}` properties (and Tailwind `tw=`, which the kit bans). It does **not** load
> CSS Modules, `tokens.css`, or resolve `var(--…)` references. So:
>
> - The OG view component (`<Route>OgImageView.tsx`) is a **documented exception** to the
>   styling-and-tokens rule: it uses inline `style={{}}` only, with values pulled from a
>   typed JS token source (`src/shared/tokens/og.ts` — a small re-export of resolved primitive
>   colors/spacing that the Style-Dictionary / Terrazzo build also emits in JS form).
> - **Never** import a `.module.css` from an OG / icon view — Satori will crash or silently
>   drop the styles.
> - The carve-out applies ONLY to files in `app/<route>/opengraph-image.tsx`,
>   `app/<route>/twitter-image.tsx`, `app/<route>/icon.tsx`, `app/<route>/apple-icon.tsx`, and
>   the `<Route>OgImageView.tsx` / `<Route>IconView.tsx` they delegate to.

```tsx
// app/active-grievances/opengraph-image.tsx
import { ImageResponse } from 'next/og';
import { ActiveGrievancesOgImageView } from '@/pages/active-grievances/routing';   // routing-shell barrel

export const alt = 'Active grievances';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OgImage() {
  return new ImageResponse(<ActiveGrievancesOgImageView />, size);
}
```

```tsx
// src/pages/active-grievances/ui/ActiveGrievancesOgImageView.tsx
// Carve-out: inline style only, token values pulled from the JS token re-export.
import { tokens } from '@/shared/tokens/og';

export function ActiveGrievancesOgImageView() {
  return (
    <div style={{
      display: 'flex', width: '100%', height: '100%',
      background: tokens.colorBgSurface, color: tokens.colorTextDefault,
      padding: tokens.spaceInsetLg, fontSize: 64,
    }}>
      Active grievances
    </div>
  );
}
```

### `app/icon.tsx` — INLINE

```tsx
// app/icon.tsx
import { ImageResponse } from 'next/og';
import { Icon } from '@/shared/ui';   // the kit's canonical Icon atom (component-structure.md)

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function AppIcon() {
  // Same Satori carve-out: only inline-style props on the Icon atom render correctly here.
  return new ImageResponse(<Icon name="app" size={32} />, size);
}
```

## Hard rules

- ❌ Business logic, fetching, or layout CSS in any root `app/` file. Root files are either
  re-exports (+ Next-required named exports) **or** inline-implementations that delegate to FSD
  slices for any non-trivial logic.
- ❌ Exporting **both** `metadata` and `generateMetadata` from the same route segment — Next.js
  rejects the build. Pick one.
- ❌ `'use client'` on `app/<route>/error.tsx` / `app/global-error.tsx` placed only on a
  re-exported source — Next reads the directive from the route file itself. The directive must
  be at the top of the **root** file.
- ❌ `app/global-error.tsx` importing the root layout's `Providers` — providers may BE the source
  of the crash. Compose the fallback from `shared/ui` atoms only.
- ❌ Route segment config (`runtime`, `dynamic`, `maxDuration`, `revalidate`, `fetchCache`)
  declared in a re-exported source module — Next only scans the route module. Inline in the
  root file.
- ❌ `generateMetadata` / `generateStaticParams` reading entity data **without** wrapping the
  call in React `cache()` — Next memoizes `fetch` only; non-`fetch` reads execute twice
  (metadata + page), silently doubling DB load.
- ❌ A Route Handler used as a **UI mutation endpoint** when a feature Server Action would do —
  Server Actions are the default. Use a Route Handler when you need streaming request bodies,
  webhooks/OAuth callbacks, public APIs for 3rd-party clients, or signed-URL proxies; document
  the reason in `project-specifics.md`.
- ❌ `'use client'` at the top of `app/**/page.tsx` (and `src/pages/<route>/ui/*Page.{tsx,jsx}`)
  — push it to the interactive feature/widget leaf. Layered enforcement (PreToolUse +
  ESLint + reviewer; see the matrix in `governance.md`).
- ❌ `'use client'` on `app/**/layout.tsx` — push providers into `src/app/providers/`, which
  IS the `'use client'` boundary.
- ❌ A `route.ts` handler that talks to secrets/DB without `import 'server-only';` and an
  explicit `export const runtime`.
- ❌ Parallel-route slots that own business logic — each slot is a **widget**; logic stays
  inside the widget slice. **`default.tsx` must physically exist** in each slot folder.
- ❌ Route groups (`(marketing)`) treated as FSD slices — they're naming-only; the FSD
  `pages/<route>/` slice is named by the URL.
- ❌ Putting `error.tsx` / `loading.tsx` / `not-found.tsx` files inline in root `app/<route>/`
  with the full implementation — they should delegate UI to a sibling in the page slice's `ui/`
  (the root file holds only the Next-required shell: directive, segment config, component
  wrapper).
- ❌ A `middleware.ts` that imports from `entities/` or `features/` — middleware runs before
  the FSD layers materialize; import only from `shared/`.
- ❌ Sitemap/robots/manifest reading entity data **outside** `src/app/model/` — they are the
  app-layer carve-out (see the "Why this exists" paragraph and the `sitemap.ts` template).
  Don't scatter them across `widgets/` or `pages/`.
- ❌ `src/app/instrumentation.ts` or `src/instrumentation.ts` — Next scans those paths too and
  may load instrumentation twice. Re-export from `src/shared/lib/instrumentation/` only.
- ✅ Re-exportable root files are one line + Next-required named exports.
- ✅ Statically-analyzed root files (error/global-error/og-image/icon, segment config) are
  inline with the directive/config in the root and the UI delegated to an FSD slice.
- ✅ `generateMetadata` / `generateStaticParams` live in `pages/<route>/model/` and wrap entity
  reads in React `cache()`.
- ✅ Webhooks → `shared/api/webhooks/<name>.handler.ts` with `import 'server-only';` and explicit
  runtime declared in the root `route.ts`.
- ✅ Middleware composes matchers + handlers from `shared/lib/middleware/`; root `middleware.ts`
  is one re-export.
- ✅ Sitemap/robots/manifest live in `src/app/model/` (the app-layer carve-out); `app/sitemap.ts` is one re-export line.

## Checklist — a route is "wired" when

- [ ] Root `app/<route>/page.tsx` is a re-export of `@/pages/<route>` with **at most one of**
  `metadata` or `generateMetadata` as a named re-export.
- [ ] Loading is a one-line re-export; error/global-error are inline `'use client'` files
  delegating UI to the page slice; not-found is a one-line re-export (or inline if interactive).
- [ ] The page screen is an RSC; no `'use client'` at its top.
- [ ] `metadata.ts` / `static-params.ts` (if any) live in `pages/<route>/model/` and entity
  reads are wrapped in `cache()`.
- [ ] Route segment config (`runtime`/`dynamic`/`maxDuration`) is declared in the root file,
  not in a re-exported source.
- [ ] If the route uses parallel routes (`@slot/`), each slot is a widget slice AND
  `default.tsx` physically exists in the slot folder.
- [ ] If the route uses intercepting routes (`(.)`), the intercepted screen is a widget slice;
  the underlying full page is unchanged.
- [ ] Any `route.ts` re-exports the handler from `shared/api/webhooks/` (or `shared/api/public/`)
  with `import 'server-only';` in the handler and runtime declared in the route file.
- [ ] Sitemap/robots/manifest live in `src/app/model/`; the root file is one re-export line.
- [ ] `global-error.tsx` is inline at root with `'use client'`, renders its own `<html>`/`<body>`,
  and does NOT import the root layout's providers.
- [ ] No business logic / layout CSS in any root `app/` file.

## Sources
- [Next.js — Routing fundamentals](https://nextjs.org/docs/app/building-your-application/routing)
- [Next.js — Loading UI and Streaming](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming)
- [Next.js — Error Handling (`error.tsx` / `global-error.tsx`)](https://nextjs.org/docs/app/building-your-application/routing/error-handling)
- [Next.js — Parallel Routes (`default.tsx` requirement)](https://nextjs.org/docs/app/building-your-application/routing/parallel-routes)
- [Next.js — Intercepting Routes](https://nextjs.org/docs/app/building-your-application/routing/intercepting-routes)
- [Next.js — Route Groups](https://nextjs.org/docs/app/building-your-application/routing/route-groups)
- [Next.js — Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Next.js — Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Next.js — Metadata files (`sitemap`, `robots`, `manifest`, `opengraph-image`, `icon`)](https://nextjs.org/docs/app/api-reference/file-conventions/metadata)
- [Next.js — `generateMetadata` (metadata + generateMetadata mutual exclusion; `cache()` recommendation)](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- [Next.js — `generateStaticParams`](https://nextjs.org/docs/app/api-reference/functions/generate-static-params)
- [Next.js — Route segment config](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config)
- [Next.js — Instrumentation](https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation)
- [React — `cache()` for memoizing non-`fetch` server reads](https://react.dev/reference/react/cache)
- [Feature-Sliced Design — Usage with Next.js](https://feature-sliced.design/docs/guides/tech/with-nextjs)
- [Feature-Sliced Design — Ultimate Next.js App Router Architecture](https://feature-sliced.design/blog/nextjs-app-router-guide)
