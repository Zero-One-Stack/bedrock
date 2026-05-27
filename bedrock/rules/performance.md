# Rule: Performance & Core Web Vitals

> **Non-negotiable.** Every page meets **Core Web Vitals "good" thresholds** in the field, and
> performance is measured, not assumed. Performance is a feature; regressions are defects.

## Targets (field data, 75th percentile)

| Metric | Measures | Good |
| ------ | -------- | ---- |
| **LCP** — Largest Contentful Paint | loading | **≤ 2.5s** |
| **INP** — Interaction to Next Paint | responsiveness (replaced FID) | **≤ 200ms** |
| **CLS** — Cumulative Layout Shift | visual stability | **≤ 0.1** |

Supporting budgets per route (set in `project-specifics.md`, enforced in CI where possible):
initial client JS, total transferred bytes, image weight. Treat budget breaches as build failures.

## Rendering strategy (the biggest lever)

- **Server Components by default.** Push `'use client'` to the smallest interactive leaf. Less
  client JS → better INP and LCP. (See `component-structure.md`.)
- Fetch on the server where possible; stream with Suspense (`loading.tsx`) so content paints early.
- Don't ship data-fetching libraries/business logic into the client bundle when the server can do it.

## Images (LCP + CLS)

- **Always `next/image`** — never a raw `<img>` for app imagery. It auto-optimizes format/size.
- Always set `width`/`height` (or `aspect-ratio`) to **reserve space** → prevents CLS.
- Set `sizes` for responsive art; use `priority` on the LCP image (hero/above-the-fold) and
  `placeholder="blur"` where useful. Lazy-load below-the-fold (default).

## Fonts (LCP + CLS)

- **`next/font`** for all fonts — self-hosts, inlines CSS, removes render-blocking requests, and
  reserves metrics to avoid layout shift. `font-display: swap`. No `<link>` to third-party font CDNs.

## JavaScript & bundle (INP + LCP)

- **Code-split** heavy/below-the-fold/rarely-used client components with `next/dynamic` (and
  `ssr: false` only when truly client-only).
- Avoid large client dependencies; prefer a small util or a server-side transform. Check size before adding a dep.
- Keep main-thread work short: no long tasks in event handlers; debounce/throttle expensive work;
  memoize (`useMemo`/`React.memo`) only where measured — not by default.
- **Audit with `@next/bundle-analyzer`** before merging anything that adds significant client code.

## Layout stability (CLS)

- Reserve space for images, ads, embeds, and async UI (skeletons sized to final content).
- Don't inject content above existing content after load. Avoid layout-triggering animation
  (animate `transform`/`opacity`, not `width`/`top`).

## Data & caching

- React Query: sensible `staleTime`/`gcTime`; don't refetch on every mount. Prefetch on the server
  or on intent (hover/route) for snappy navigation.
- Use Next.js caching/revalidation deliberately; don't opt everything into dynamic rendering.
- Paginate/virtualize long lists; never render thousands of nodes.

## Measurement (build the pipeline first)

- **Field (RUM):** capture real-user CWV via `web-vitals` / the app's monitoring; this is the
  source of truth. Optimize what the data shows is slow — not guesses.
- **Lab:** Lighthouse / Lighthouse-CI on key routes in CI as a guardrail.
- Track the budgets per route; alert on regressions.

## Hard rules

- ❌ Raw `<img>` for app imagery; images without reserved dimensions.
- ❌ Third-party font `<link>` instead of `next/font`.
- ❌ `'use client'` at the top of a page/route when a leaf would do.
- ❌ Adding a heavy client dependency without checking bundle impact.
- ❌ Shipping without a field-measurement path for CWV.
- ✅ RSC-first; `next/image` + `next/font`; code-split; reserve space; measure in the field; budgets in CI.

## Checklist (per page / per significant change)
- [ ] Interactive code is in client leaves, not whole pages.
- [ ] Images via `next/image` with dimensions + `sizes`; LCP image `priority`.
- [ ] Fonts via `next/font`.
- [ ] Heavy/below-fold client code dynamically imported; bundle checked.
- [ ] No CLS from late content/animation; skeletons sized.
- [ ] React Query caching tuned; long lists virtualized.
- [ ] CWV measured in the field; route budgets not exceeded.

## Sources
- [web.dev — Core Web Vitals (LCP/INP/CLS)](https://web.dev/articles/vitals)
- [Optimize Next.js apps for Core Web Vitals (patterns.dev)](https://www.patterns.dev/react/nextjs-vitals/)
- [Optimize Web Vitals in Next.js App Router 2025 (Makers' Den)](https://makersden.io/blog/optimize-web-vitals-in-nextjs-2025)
