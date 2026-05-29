# External references — bundled snippets for the kit's adopted libraries

> **Why this exists.** Vercel's Next.js team published evidence in early 2026 that bundled
> docs (`node_modules/next/dist/docs/`) produce **100% eval pass** on internal benchmarks vs
> **79% with on-demand skill / web retrieval**. The signal: when an LLM can `cat` curated
> docs locally, it stops drifting toward stale training data or rate-limited web fetches.

This folder is the kit's analog. Each file is a **tight, opinionated, cross-checked snippet**
covering the patterns the kit's `rules/` actually use. The intent is **not** to replicate the
library's full docs — it's to ship just enough that the LLM doesn't need to web-fetch the
common patterns. The library's own docs remain the source of truth for anything not here.

## What lives here

| File | Library | What's covered |
| --- | --- | --- |
| `next-15-hot-spots.md` | Next.js 15+ App Router | Async `params`/`searchParams`, `generateMetadata` + React `cache()`, route segment config placement, `default.tsx` requirement for parallel routes, `suppressHydrationWarning` on `<html>`. |
| `react-query.md` | TanStack React Query | The kit's QueryClient setup, `useQuery` + `useMutation`, query keys, `HydrationBoundary` for RSC, `invalidateQueries` after Server Actions. |
| `react-hook-form.md` | React Hook Form | `useForm` + `zodResolver`, `Controller` wiring (the kit's canonical pattern for form primitives), `formState` errors, controlled vs uncontrolled. |
| `zod.md` | Zod | v3 vs v4 API differences (`z.string().datetime()` → `z.iso.datetime()`), `z.infer`, `z.coerce.date()`, parse vs safeParse, error shape. |
| `storybook-9.md` | Storybook 9 | CSF3 + autodocs setup, `play` functions, `addon-a11y` with `test: 'error'`, the theme/viewport/forced-colors/RTL matrix in `preview.ts`, test-runner CI. |
| `msw-2.md` | Mock Service Worker 2.x | The 2.x `http` + `HttpResponse` syntax (different from 1.x), per-test handler override, `setupServer` in test-utils. |
| `event-bus.md` | **Kit-authored** (not 3rd-party) | The full copy-paste implementation of the cross-slice event bus (`shared/lib/events/`): `createBus()` + globalThis-guarded MF-safe singleton, async + error-isolated dispatch, the `useEvent` hook, publish/subscribe patterns, the analytics bridge, the `BroadcastChannel` cross-tab adapter, and the test seam. Cited by `cross-slice-communication.md`. |

## How to use

- **Rule files cite these by relative path** — e.g. `services-and-data.md` points at
  `docs/external-references/react-query.md` for the QueryClient setup boilerplate. The
  LLM `cat`s the snippet, applies it, and doesn't web-fetch.
- **Verify the installed major** before applying any snippet. Each file declares the
  version range it was written against; if Recon shows a different major, the snippet may
  be wrong (especially Zod v3→v4 and MSW 1→2).
- **Don't expand these into full library docs.** Each file is intentionally ~100 lines.
  Anything beyond the kit's pattern goes to the library's own docs.
- **Refresh on plugin upgrade.** When the kit's Tech Radar moves a library to a new
  recommended version (e.g. Next.js 15 → 16), regenerate the affected snippets in the
  same PR that updates the radar.

## What is NOT bundled

- Headless behavior libraries (Base UI, Radix, React Aria, Ariakit) — the kit recommends
  one **per repo** (`component-composition.md`); bundling all four sets of docs would
  bloat the kit. Each repo's `project-specifics.md` records its choice; the rule file
  cites the library's own docs.
- Tailwind / Chakra / vanilla-extract / Panda — same reason; engine choice is project-
  level (`styling-engine.md`).
- The full Next.js docs — too large. The `next-15-hot-spots.md` file targets only the
  places where the kit's rules intersect Next.js's API surface.
- Library changelogs — Tech Radar handles version policy.

## Updating

When a library ships a breaking change the kit relies on:

1. Verify the change against the official docs (or Context7).
2. Update the relevant `*.md` here, including a `**Verified against:** <version>` line.
3. Update any rule file that cites the changed API.
4. Add a Tech Radar entry if the change moves the library between rings.
5. Bump the kit's `version` in `marketplace.json`; downstream projects pick up the change
   via `/plugin update` + `/bedrock:sync-kit`.
