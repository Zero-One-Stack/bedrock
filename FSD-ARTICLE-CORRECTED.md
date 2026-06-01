# Feature-Sliced Design for React + Next.js 16 (2026 edition)

> **What changed vs. the original draft.** This is a corrected rewrite of an FSD primer that
> was written to FSD **v2.0** (the 2023 mental model) and used 2022-era React idioms. It now
> tracks FSD **v2.1 ("Pages First")** and **Next.js 16** App Router conventions. The substantive
> corrections: `processes/` removed (deprecated by the spec), **six** layers not seven,
> **Pages-First** decomposition (build in the page, extract *down* only on real reuse — the
> reverse of the old "extract entities/features early" advice), the **`@x` cross-import** escape
> hatch for entities, **React Query + React Server Components** instead of `useEffect`+`axios`,
> the **`'use client'` leaf** discipline, and `server-only` / `'use server'` runtime markers.
>
> **Next.js 16 specifics applied throughout:** `params`/`searchParams`/`cookies`/`headers` are
> **async** (sync access fully removed); the **`PageProps<'/route'>`** typegen helper; the
> **`middleware.ts` → `proxy.ts`** rename; **`revalidateTag` now needs a second `cacheLife`
> argument**, plus the new **`updateTag`** (read-your-writes) and **`refresh`** Server-Action
> APIs; opt-in **Cache Components (`use cache`)**; React **19.2** + stable **React Compiler**;
> **Turbopack** is the default bundler; `images.domains` → `remotePatterns`. Sources are listed
> at the bottom.

## Introduction

As frontend applications grow in complexity, maintaining a scalable and understandable codebase becomes increasingly challenging. Feature-Sliced Design (FSD) is a modern architectural methodology that addresses these challenges by providing a standardized approach to organizing frontend code. In this guide we explore FSD in depth for React applications with TypeScript, with a Next.js App Router focus.

## What is Feature-Sliced Design?

Feature-Sliced Design is an architectural methodology for frontend projects that emphasizes:

- **Standardization** — a unified structure any developer can understand
- **Controlled reusability** — clear rules about what can depend on what
- **Separation of concerns** — business logic separated from UI and technical details
- **Scalability** — structure that grows naturally with your application

Unlike traditional approaches like MVC or component-based organization, FSD focuses on decomposition by **business value** rather than technical roles.

## The Core Principles

1. **Layered architecture** — code is organized into layers with strict dependency rules. Each layer can only depend on layers below it.
2. **Slices within layers** — within most layers, code is organized into slices: isolated modules that contain all the logic for a specific feature or entity.
3. **Segments within slices** — each slice is divided into segments: standardized folders that group code by technical purpose (`ui`, `api`, `model`, `lib`, `config`).

## The FSD Layers (Top to Bottom)

```
src/
├── app/        # Application initialization (providers, global styles, router wiring)
├── pages/      # Application pages / route screens
├── widgets/    # Large self-contained UI blocks
├── features/   # User interactions and business actions
├── entities/   # Business domain models
└── shared/     # Reusable, business-agnostic infrastructure
```

> **There is no `processes/` layer.** Earlier FSD versions had an optional seventh `processes/`
> layer for cross-page flows. **It is deprecated.** The [official spec](https://feature-sliced.design/docs/reference/layers)
> states: *"This layer has been deprecated. The current version of the spec recommends avoiding
> it and moving its contents to `features` and `app` instead."* Cross-page flows now live in `app`
> or are composed by a `page`. A **multi-step wizard** belongs in a **`widget`** slice: the widget
> owns the step state (current step, accumulated values, can-go-next), and each step's form +
> submit logic stays in its own `feature/<step-action>/`.

### Layer 1: App Layer

The app layer is responsible for application initialization and configuration. It's the only layer that can import from all other layers.

**Responsibilities:** provider setup (Router, Store, Theme), global styles and config, the application entry point, app-wide HOCs.

```
app/
├── providers/
│   ├── index.tsx          ← the single 'use client' provider shell
│   ├── theme.tsx
│   ├── query.tsx
│   └── auth.tsx
├── styles/
│   └── globals.css
└── index.tsx
```

> **On Next.js, the app layer holds providers and global styles — not layout markup.** The Next
> `app/layout.tsx` (at the repo root) injects fonts/CSS and wraps children in the provider shell;
> it carries **zero layout styling and no business logic**. See the Next.js section below.

```tsx
// src/app/providers/index.tsx — the ONE provider shell, order matters (see the Next.js section).
'use client';
import { ReactNode } from 'react';
import { ThemeProvider } from './theme';
import { QueryProvider } from './query';
import { AuthProvider } from './auth';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthProvider>{children}</AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
```

### Layer 2: Pages Layer

The pages layer contains the application's route screens. **In FSD v2.1, the page is where you start — and often where you stop.** Most UI and logic begins life inside a page slice and only moves down into a widget/feature/entity once reuse is real (see "Choosing the right layer" below).

**Responsibilities:** the route's screen, reading URL params, pulling server data (via RSC), arranging widgets/features/entities, route-local-only blocks. **No business rules.**

```
pages/
├── home/
│   ├── ui/
│   │   ├── home-page.tsx
│   │   ├── hero/                 ← route-local-only block: a plain folder, NOT a slice
│   │   └── featured-products/    ← (no nested model/api, no nested index.ts)
│   ├── model/
│   │   └── use-home-data.ts
│   └── index.ts
└── product-details/
    ├── ui/
    │   └── product-details-page.tsx
    └── index.ts
```

```tsx
// pages/product-details/ui/product-details-page.tsx — a Server Component (no 'use client').
import { ProductCard } from '@/entities/product';
import { AddToCartButton } from '@/features/add-to-cart';
import { ProductReviews } from '@/widgets/product-reviews';
import { getProduct } from '@/entities/product';   // server-only entity query

export async function ProductDetailsPage({ id }: { id: string }) {
  const product = await getProduct(id);            // RSC fetch — no useEffect/useState
  if (!product) return <div>Product not found</div>;

  return (
    <div>
      <ProductCard product={product} />
      <AddToCartButton productId={product.id} />    {/* the interactive 'use client' leaf */}
      <ProductReviews productId={product.id} />
    </div>
  );
}
```

> **`'use client'` does NOT go at the top of a page.** The page is a Server Component; the
> interactive leaves (`AddToCartButton`) carry `'use client'`. This keeps the JS bundle small and
> lets the page fetch on the server.

### Layer 3: Widgets Layer

Widgets are large, self-contained UI blocks that compose multiple features and entities into a complete use case (a header, a dashboard panel, a multi-step wizard).

**Characteristics:** self-contained; can use features and entities; **cannot** use other widgets or pages; may own its own store/api (FSD v2.1); business-aware but page-agnostic.

```
widgets/
├── header/
│   ├── ui/header.tsx
│   ├── model/use-header-state.ts
│   └── index.ts
└── product-reviews/
    ├── ui/
    │   ├── product-reviews.tsx
    │   └── review-form.tsx
    ├── model/types.ts
    ├── api/reviews.queries.ts
    └── index.ts
```

```tsx
// widgets/header/ui/header.tsx
import { Logo } from '@/shared/ui';
import { SearchBar } from '@/features/search';
import { UserMenu } from '@/features/user-menu';
import { CartButton } from '@/features/cart';
import styles from './header.module.css';

export function Header() {
  return (
    <header className={styles.header}>
      <Logo />
      <SearchBar />
      <div className={styles.actions}>
        <UserMenu />
        <CartButton />
      </div>
    </header>
  );
}
```

### Layer 4: Features Layer

Features represent **user actions that change state** (the *verbs* of your app). Each feature is a slice encapsulating one user-valuable action.

**Characteristics:** implements one user interaction with its own form/validation/server-action; can use entities and shared; **cannot** use other features, widgets, or pages; context-aware, **never full-screen**.

**Examples:** `add-to-cart`, `like-post`, `leave-review`, `auth-by-email`, `filter-products`.

```
features/
├── add-to-cart/
│   ├── ui/add-to-cart-button.tsx     ← 'use client' lives here
│   ├── model/
│   │   ├── use-add-to-cart.ts
│   │   └── types.ts
│   ├── api/add-to-cart.action.ts     ← 'use server'
│   └── index.ts
└── auth-by-email/
    ├── ui/login-form.tsx
    ├── model/
    │   ├── schema.ts                 ← Zod
    │   └── use-login.ts              ← React Hook Form
    ├── api/auth.action.ts
    └── index.ts
```

```tsx
// features/add-to-cart/ui/add-to-cart-button.tsx
'use client';
import { Button } from '@/shared/ui';
import { useAddToCart } from '../model/use-add-to-cart';

interface AddToCartButtonProps {
  productId: string;
  variant?: 'primary' | 'secondary';
}

export function AddToCartButton({ productId, variant = 'primary' }: AddToCartButtonProps) {
  const { addToCart, isPending } = useAddToCart();
  return (
    <Button onClick={() => addToCart(productId)} disabled={isPending} variant={variant}>
      {isPending ? 'Adding…' : 'Add to Cart'}
    </Button>
  );
}
```

```ts
// features/add-to-cart/model/use-add-to-cart.ts — React Query mutation, not manual useState.
'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addToCartAction } from '../api/add-to-cart.action';
import { cartKeys } from '@/entities/cart';

export function useAddToCart() {
  const qc = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: (productId: string) => addToCartAction(productId),
    onSuccess: () => qc.invalidateQueries({ queryKey: cartKeys.all() }), // re-read the truth
  });
  return { addToCart: mutate, isPending };
}
```

```ts
// features/add-to-cart/api/add-to-cart.action.ts — Next.js 16 cache APIs.
'use server';
import { updateTag } from 'next/cache';
import { cartTag } from '@/entities/cart';

export async function addToCartAction(productId: string) {
  // …persist the change…
  // Next 16: updateTag gives read-your-writes — the user sees their cart change immediately,
  // not stale-while-revalidate. Use it for interactive mutations like this one.
  updateTag(cartTag());
}
```

> **Next.js 16 cache-API cheat sheet** (these replace the old single-arg `revalidateTag` /
> blanket `revalidatePath`):
>
> | API | When to use |
> | --- | --- |
> | `updateTag(tag)` | **Server Actions only.** Read-your-writes: expire **and** refresh in the same request so the user sees their own change instantly. The default for interactive mutations (forms, cart, settings). |
> | `revalidateTag(tag, 'max')` | Content where a slight delay is fine (catalogs, blog posts). Stale-while-revalidate. **The second argument is now required** — `'max'` for SWR, or `{ expire: 0 }` for immediate. The old single-arg form is a TypeScript error. |
> | `refresh()` | Server Action: refresh the client router after an action without targeting a specific tag (e.g. a header notification count). |

> **Why the change from the old `useEffect`/`axios`/Redux pattern:** manual fetching has no
> caching, no request dedup, no built-in loading/error states, and races on unmount. React Query
> (client) + RSC (server) handle all of that. State mutations flow **bottom-up**: a feature runs a
> Server Action, then **invalidates** the cache (`updateTag`/`revalidateTag` on the server, or a
> React Query `invalidateQueries` on the client), which re-runs the top-of-tree fetch and flows
> fresh data back down. **Reads down, writes up.**

### Layer 5: Entities Layer

Entities represent **business domain models** (the *nouns*). They hold the data model, schema, and **read-only** UI for a core concept.

**Characteristics:** represent domain concepts; contain the schema/types (the source of truth) + read queries + read-only UI; can only use shared; **cannot** use features/widgets/pages; **no mutations, no action buttons** (those are features).

**Examples:** `user`, `product`, `order`, `review`, `cart`.

```
entities/
├── user/
│   ├── ui/user-card.tsx              ← read-only display
│   ├── model/
│   │   ├── user.ts                   ← Zod schema + TS types
│   │   └── selectors.ts
│   ├── api/user.queries.ts           ← server-only read queries
│   ├── @x/                           ← scoped cross-import API (entities-only escape hatch)
│   │   └── order.ts
│   └── index.ts
└── product/
    ├── ui/product-card.tsx
    ├── model/product.ts
    ├── api/product.queries.ts
    └── index.ts
```

```ts
// entities/product/model/product.ts — schema is the source of truth.
import { z } from 'zod';

export const ProductSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  price: z.number(),
  imageUrl: z.string().url(),
  category: z.string(),
  inStock: z.boolean(),
});
export type Product = z.infer<typeof ProductSchema>;
```

```ts
// entities/product/api/product.queries.ts — SERVER-ONLY. The marker prevents a client-bundle leak.
import 'server-only';
import { apiClient } from '@/shared/api';
import { ProductSchema, type Product } from '../model/product';

export async function getProducts(): Promise<Product[]> {
  const data = await apiClient.get('/products');
  return ProductSchema.array().parse(data);   // validate at the boundary, no `as` cast
}
export async function getProduct(id: string): Promise<Product | null> {
  const data = await apiClient.get(`/products/${id}`);
  return data ? ProductSchema.parse(data) : null;
}
```

```tsx
// entities/product/ui/product-card.tsx — read-only, no action buttons.
import Image from 'next/image';          // never a raw <img> in Next.js
import { Card, Price } from '@/shared/ui';
import type { Product } from '../model/product';
import styles from './product-card.module.css';

export function ProductCard({ product }: { product: Product }) {
  return (
    <Card className={styles.card}>
      <Image src={product.imageUrl} alt={product.title} width={320} height={240} />
      <h3>{product.title}</h3>
      <Price amount={product.price} />
      {!product.inStock && <span className={styles.outOfStock}>Out of Stock</span>}
    </Card>
  );
}
```

> **Next 16 `next/image` notes:** configure remote hosts with **`images.remotePatterns`** —
> `images.domains` is deprecated, and `next/legacy/image` is removed. v16 also tightened defaults:
> `qualities` is now `[75]` only, `minimumCacheTTL` rose to 4 hours, and local IP sources are
> blocked unless explicitly allowed. Widen these in `next.config.ts` only if you actually need to.

### Layer 6: Shared Layer

The shared layer contains reusable infrastructure with **no business logic**. It's the foundation every other layer uses, and it imports nothing above it.

**Characteristics:** no business terminology; highly reusable; technology-focused; can only use other shared modules.

```
shared/
├── ui/                    ← the design system (Button, Input, Modal, Card, Price)
│   ├── button/
│   └── index.ts
├── lib/                   ← grouped by PURPOSE, never by essence
│   ├── cx/                ← class-merge util
│   ├── date/
│   ├── format/
│   └── events/            ← the typed event bus (see "Cross-slice communication")
├── api/                   ← base fetch/client (no domain endpoints)
│   └── index.ts
└── config/
```

> **Group `shared/lib` by purpose, not essence.** `shared/lib/hooks/`, `shared/lib/utils/`,
> `shared/lib/components/`, `shared/lib/types/` are **banned** — they describe what a thing *is*,
> not *why* it exists. A hook that formats a date goes in `shared/lib/date/`, not
> `shared/lib/hooks/`.

```tsx
// shared/ui/button/button.tsx
import { ButtonHTMLAttributes } from 'react';
import { cx } from '@/shared/lib/cx';            // the kit's ONE class-merge util
import styles from './button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
}

export function Button({ variant = 'primary', size = 'medium', className, ...props }: ButtonProps) {
  return <button className={cx(styles.button, styles[variant], styles[size], className)} {...props} />;
}
```

## Standard Segments

Each slice (except `app`/`shared`, which have only segments) can contain these standardized, **purpose-named** segments:

| Segment | Holds |
| --- | --- |
| `ui/` | Components, styles, formatters — anything display. |
| `model/` | Schemas, types, stores, business logic, selectors, hooks. |
| `api/` | Backend interaction: request fns, DTOs, mappers, server queries/actions. |
| `lib/` | Helper code used by *other modules within this same slice*. |
| `config/` | Config and feature flags. |

> **Banned segment names:** `components/`, `hooks/`, `modals/`, `utils/`, `helpers/`, `types/`,
> `constants/` — these name *essence*, not *purpose*. A data-fetching hook is `model/`; a generic
> helper is `lib/`.

## The Import Rule (the whole methodology)

> **A module can only import from layers strictly below it.**

```
app → pages → widgets → features → entities → shared
```

**Allowed:**

```ts
// a feature can import from entities and shared
import { Product } from '@/entities/product';
import { Button } from '@/shared/ui';
```

**Not allowed:**

```ts
// ❌ entities/product CANNOT import from features (upward import — fatal)
import { AddToCartButton } from '@/features/add-to-cart';

// ❌ features/add-to-cart CANNOT import from widgets (upward import)
import { Header } from '@/widgets/header';
```

`app` sits at the top (imports everything below); `shared` sits at the bottom (imports nothing above). Both are layer **and** slice at once — they have no slices, only segments, and their segments may import each other freely.

## Cross-Slice Communication

Slices on the same layer must **not** directly import each other. In priority order, resolve a same-layer dependency by:

1. **Compose from above (preferred).** Two features both needed on a screen? The **page or widget** imports both and wires them. The widget owns the wiring; neither feature imports the other.
2. **Push the shared part down.** Logic two features share belongs in an `entity` or in `shared/lib`. Both then import downward — legal — and the coupling disappears.
3. **Merge** the two slices if they always change together.
4. **The `@x` cross-import (entities only).** For a genuine entity-to-entity domain relationship (an `order` references the `user` who placed it), the *imported* entity publishes a separate, scoped public API for the consumer:

```
entities/
  user/
    @x/
      order.ts          ← user's public API, scoped FOR order
    index.ts            ← user's general public API
```

```ts
// entities/user/@x/order.ts — expose ONLY what the consumer needs
export type { User } from '../model/user';

// entities/order/model/order.ts
import type { User } from '@/entities/user/@x/order';
export interface Order { placedBy: User; /* … */ }
```

> **`@x` is entities-only** — never on features/widgets/pages. Keep cross-imports rare (each is
> coupling). Before reaching for `@x`, try compose-from-above or push-down first.

### Compose from above with headless feature hooks

"Compose from above" is the rule; **headless feature hooks** are the mechanism. A feature exposes BOTH a rendered UI AND a hook (`useXFeature()`) that returns its imperative API. The hook is the seam — any widget can wire one feature's hook to another feature's UI without the features importing each other.

```ts
// features/file-review/index.ts — public API exposes BOTH the UI and the hook.
export { FileReviewForm } from './ui/file-review-form';
export { useFileReview } from './model/use-file-review';   // ← the headless hook
```

```tsx
// widgets/review-panel/ui/review-panel.tsx — composes two features without either importing the other.
'use client';
import { useFileReview, FileReviewForm } from '@/features/file-review';
import { useModerate } from '@/features/moderate';
import { Dialog } from '@/shared/ui';

export function ReviewPanel() {
  const file = useFileReview();
  const moderate = useModerate({ onDone: file.close }); // the widget wires them
  return (
    <Dialog.Root open={file.isOpen} onOpenChange={file.close}>
      <Dialog.Content><FileReviewForm onSubmitted={moderate.run} /></Dialog.Content>
    </Dialog.Root>
  );
}
```

### When composition can't reach: the typed event bus

Compose-from-above works when one parent owns both slices. It breaks down for **fan-out** (one action, many independent reactors), **distance** (slices in different subtrees), and **cross-cutting observers** (analytics/audit). For those — and only those — use a typed event bus on the `shared` floor (`shared/lib/events/`): both slices import *down* into it, so neither imports the other.

The bus carries **transient, past-tense facts** (`'review:filed'`), never state, commands, or request/response. A subscriber that misses an event must not break — the event is a **trigger to re-read the truth** (from the React Query cache), never the truth itself.

```tsx
// A badge reacts to a fan-out event by re-reading the cache, NOT by ++ a local counter.
'use client';
import { useEvent } from '@/shared/lib/events';
import { useQueryClient } from '@tanstack/react-query';
import { reviewKeys } from '@/entities/review';

export function ReviewBadge({ count }: { count: number }) {
  const qc = useQueryClient();
  useEvent('review:filed', () => qc.invalidateQueries({ queryKey: reviewKeys.count() }));
  return <span aria-label={`${count} reviews`}>{count}</span>;
}
```

> **Don't reach for the bus by default.** Most "cross-feature reactivity" is actually **derived
> state** — and derived state belongs in the **React Query cache**, which already broadcasts to
> every observer regardless of tree distance *and* replays to late-mounting subscribers (which the
> bus can't). Use an event only when the signal is transient, non-state, and has many open-ended
> reactors.

## The Public API barrier

Every slice has a root `index.ts` that **is** its public contract. Outside code imports the slice *only* through it.

```ts
// ❌ ILLEGAL — deep import bypasses the public API
import { ProductCard } from '@/entities/product/ui/product-card';

// ✅ REQUIRED
import { ProductCard } from '@/entities/product';
```

```ts
// entities/product/index.ts — list exports explicitly. NO `export *`.
export { ProductCard } from './ui/product-card';
export { getProduct, getProducts } from './api/product.queries';
export { ProductSchema, type Product } from './model/product';
```

- **No `export *`** — it hurts discoverability and silently leaks (then accidentally breaks) internals.
- **Use `export type { … }`** for type-only exports so no runtime cost leaks into the consumer's bundle.
- **No layer-level `index.ts`** — the public API is per-slice, not per-layer.
- **Mark deprecated exports** with `@deprecated` JSDoc so the warning shows in every consumer's IDE.

## TypeScript Configuration

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/app/*":      ["src/app/*"],
      "@/pages/*":    ["src/pages/*"],
      "@/widgets/*":  ["src/widgets/*"],
      "@/features/*": ["src/features/*"],
      "@/entities/*": ["src/entities/*"],
      "@/shared/*":   ["src/shared/*"]
    }
  }
}
```

## FSD on Next.js App Router (the layer-name collision, solved)

FSD owns layer folders named `app` and `pages`; Next.js owns a routing directory named `app/`. They collide. The official resolution — **keep Next's router at the repo root; put all FSD layers under `src/`**:

```
/                       repo root
├── app/                ← NEXT.JS ROUTING ONLY. Thin. No business logic.
│   ├── layout.tsx       imports the FSD provider shell; injects fonts/CSS
│   ├── page.tsx         export { HomePage as default } from '@/pages/home'
│   └── products/[id]/
│       └── page.tsx     re-exports the FSD page slice
├── proxy.ts             ← Next 16: renamed from middleware.ts. Stays at root.
└── src/                ← ALL FSD LAYERS
    ├── app/             providers, global styles
    ├── pages/           the FSD page slices
    ├── widgets/
    ├── features/
    ├── entities/
    └── shared/
```

> **Next 16: `middleware.ts` is now `proxy.ts`.** The `middleware` filename and named export are
> deprecated; rename the file to `proxy.ts` and the function to `proxy`. Note the `proxy` runtime
> is `nodejs` (not configurable) — if you still need the `edge` runtime, keep the old
> `middleware.ts` for now. The middleware-named config flags also renamed (e.g.
> `skipMiddlewareUrlNormalize` → `skipProxyUrlNormalize`). The v16 codemod handles all of this.

```tsx
// app/products/[id]/page.tsx — a near-empty re-export of the FSD page slice.
// Next 16: params/searchParams are async. The PageProps<'/route'> helper (from `next typegen`)
// types them for you — run `npx next typegen` to generate it.
import { ProductDetailsPage } from '@/pages/product-details';

export default async function Page(props: PageProps<'/products/[id]'>) {
  const { id } = await props.params;      // Next 16: params is a Promise (sync access removed)
  return <ProductDetailsPage id={id} />;
}
```

```tsx
// app/layout.tsx — Server Component. Injects the provider shell; NO layout styling.
import { Providers } from '@/app/providers';
import '@/app/styles/globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
```

### Render & data flow

- **Server Components by default.** `'use client'` lives on the **interactive leaf** — in features and widgets, never at the top of a route or page.
- **Reads are top-down (RSC).** The page (Server Component) calls **entity queries** (`entities/<x>/api/*.queries.ts`, marked `import 'server-only';`) and passes plain data **down as props**. Client-side reuse goes through React Query.
- **Writes are bottom-up.** A feature (client leaf) runs a **Server Action** (`'use server'`), then **invalidates** the cache — Next 16 server side: `updateTag(tag)` for read-your-writes or `revalidateTag(tag, 'max')` for SWR; client side: React Query `invalidateQueries`. Reads down, writes up.
- **Never copy server data into client state.** Server state = React Query / RSC; client state = React primitives / React Hook Form.

> **Environment variables:** Next uses `process.env.NEXT_PUBLIC_*` for client-exposed values (and
> unprefixed vars stay server-only). The old `REACT_APP_*` convention is **Create React App**,
> which is no longer recommended. **Next 16 removed `serverRuntimeConfig`/`publicRuntimeConfig`** —
> read `process.env` directly in Server Components, and call `await connection()` before reading a
> value that must be evaluated at *runtime* rather than baked in at build time.

### Cache Components (`use cache`) — Next 16's opt-in caching model

Next 16 made caching **explicit and opt-in**. By default, all dynamic code in a page, layout, or
route runs at request time — there's no implicit Data Cache surprising you. To cache, enable Cache
Components and mark the cacheable unit with the **`use cache`** directive:

```ts
// next.config.ts — opt in (this also enables Partial Prerendering; the old experimental_ppr flag is gone)
import type { NextConfig } from 'next';
const nextConfig: NextConfig = { cacheComponents: true };
export default nextConfig;
```

```ts
// entities/product/api/product.queries.ts — cache a read at the function level.
import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';   // Next 16: stable, no unstable_ prefix
import { apiClient } from '@/shared/api';
import { ProductSchema, type Product } from '../model/product';

export async function getProducts(): Promise<Product[]> {
  'use cache';                       // the compiler generates the cache key
  cacheLife('hours');                // how long it stays fresh
  cacheTag('products');              // tag so updateTag('products')/revalidateTag(...) can bust it
  const data = await apiClient.get('/products');
  return ProductSchema.array().parse(data);
}
```

> **How this maps to FSD:** `use cache` + `cacheTag`/`cacheLife` live in the **entity's `api/`
> segment** (where reads already live); the matching `updateTag`/`revalidateTag` lives in the
> **feature's `api/` action** (where writes live). The tag string is the contract between them —
> export a small `cartTag()`/`productsTag()` helper from the entity's public API so the feature
> doesn't hard-code the string. Cache Components is optional; if you don't enable it, the React
> Query + RSC patterns above work unchanged.

## Choosing the right layer — Pages First (the v2.1 model)

> **This is the biggest change from older FSD guides.** v2.0 told you to identify entities and
> features first and treat pages as thin glue. **v2.1 reversed that:** start with the page, keep
> most UI and logic there, and extract *down* only when reuse is real. Most code starts in a page
> and may never leave it.

The default-and-demote algorithm:

```
1. Build it INSIDE the page slice (pages/<route>/ui/) first. Always. Finish it there.
2. Is it a USER action that mutates state (a verb: add-, like-, filter-)?
     └─ AND reused on a 2nd screen, OR worth isolating for testing/ownership?
          → extract DOWN to features/<action>/.   (else: leave it in the page)
3. Is it a self-contained BLOCK composing ≥2 features/entities, reused across pages?
          → extract DOWN to widgets/<block>/.      (else: leave it in the page)
4. Is it a domain NOUN — a model + its read-only view (product, user)?
          → entities/<model>/.                      (usually known up front)
```

Tie-breakers:

- **Verb → feature, noun → entity, block-of-both → widget.** "Add to cart" is a verb (feature); "a cart" is a noun (entity); "the cart panel showing items *and* a checkout button" is a block (widget).
- **Reuse count decides extraction, not how "nice" the abstraction is.** One consumer → it stays in the page. The *second* consumer is the trigger to extract.
- **Full-screen → never a feature.** A full screen is a `page`.

### When a single page slice gets too big

Pages-First has a known flip side: a large page accumulates many unrelated blocks. The answer, in priority order:

1. **Question whether they're really one page.** Several unrelated blocks usually means reuse is real or imminent — extract the independent ones *down* to `widgets/`.
2. **For blocks genuinely local to this one route**, organize within the page's `ui/` by **purpose-named sub-folders** (`pages/home/ui/hero/`, `pages/home/ui/promo-rail/`). These are **plain component folders, not slices** — no nested `model/api`, no nested `index.ts`, no `'use client'` on the page screen. Sub-folder names must be purpose/domain-named, never essence-named (`components/`, `hooks/`) and never segment-named (`ui/`, `model/`).
3. **Do NOT** revive `processes/`, nest FSD layers inside a slice, or use a cross-page prefix scheme. A block shared across pages is a `widget` — extract it.

## Migration Strategy (Pages-First order)

> **This is the reverse of the old "extract entities first" advice.** Don't proactively shred a
> codebase into entities and features. Start at the page and pull down only on real reuse.

If you're adopting FSD on an existing project, migrate gradually:

1. **Establish `shared/`** — move generic UI components and business-agnostic utilities to `shared/ui` and `shared/lib` (grouped by purpose).
2. **Set up `app/`** — consolidate providers into one shell and global styles.
3. **Move screens into `pages/`** — give each route a page slice, and **keep most logic in the page for now.**
4. **Extract entities only where a domain model is clearly shared** — the schema/types + read-only UI for a noun used across screens.
5. **Extract features when an action is reused** (or genuinely worth isolating).
6. **Extract widgets when a composed block is reused** across pages.
7. **Refine continuously** — don't extract speculatively; let the second consumer trigger each move.

## Best Practices

1. **Pages First, extract down on real reuse.** Don't pre-shred into entities/features.
2. **Keep slices small and focused** — one clear responsibility each.
3. **Use public APIs** — always export through `index.ts`; never deep-import.
4. **Avoid circular dependencies** — follow the layer rules; import siblings by leaf path, never the slice's own `index.ts`.
5. **Co-locate related code** — UI, logic, and styles together within a slice.
6. **Server Components by default; `'use client'` on the leaf** — never on a whole page.
7. **React Query for client reads, RSC for server reads** — never manual `useEffect`+`fetch`.
8. **Validate at the boundary with Zod**; no `any`, no unchecked `as` casts.
9. **Use TypeScript strictly** to enforce architectural boundaries early.
10. **On Next 16, prefer `updateTag` for interactive mutations** (read-your-writes), `revalidateTag(tag, 'max')` for content that tolerates a delay, and treat caching as opt-in via `use cache` — don't assume an implicit Data Cache.

### Next.js 16 tooling at a glance

These don't change the FSD structure but are the environment you're building in:

- **Turbopack is the default** for `next dev` and `next build` — drop the `--turbopack` flag. A custom `webpack` config now fails the build unless you opt out with `--webpack`.
- **React 19.2** (View Transitions, `useEffectEvent`, `Activity`) and **React Compiler 1.0** is stable (`reactCompiler: true`, opt-in) — it auto-memoizes, so you write fewer `useMemo`/`useCallback` by hand.
- **`next lint` is removed** — run ESLint (flat config) or Biome directly; `next build` no longer lints.
- **`next typegen`** generates the `PageProps`/`LayoutProps`/`RouteContext` helpers — run it after changing routes.
- **Parallel-route slots now require an explicit `default.tsx`** or the build fails.
- **Minimums:** Node 20.9+, TypeScript 5.1+.

## Common Pitfalls

1. **Reviving `processes/`** — it's deprecated. Cross-page flows live in `app`/`pages`; wizards live in a `widget`.
2. **Pre-extracting entities/features (v2.0 thinking)** — creates "insignificant slices" used 0–1 times. Build in the page first.
3. **Skipping the public API** — deep imports break encapsulation. Always use `index.ts`.
4. **Business logic in UI components** — keep it in `model/`.
5. **`'use client'` on a whole page** — push it to the interactive leaf.
6. **Manual `useEffect`/`axios` fetching** — no caching, dedup, or race safety. Use React Query / RSC.
7. **Mixing responsibilities** — entities are *what things ARE* (nouns, data, read-only); features are *what users CAN DO* (verbs, actions). A mutation or action button does **not** belong in an entity.
8. **Essence-named segments** (`components/`, `hooks/`, `utils/`) — name by purpose.
9. **Single-arg `revalidateTag('x')` on Next 16** — it's now a TypeScript error. Pass the `cacheLife` second argument, or use `updateTag`.
10. **Leaving `middleware.ts` on Next 16** — rename to `proxy.ts` (unless you specifically need the `edge` runtime).
11. **Raw `<img>` / `images.domains`** — use `next/image` with `images.remotePatterns`.

## Conclusion

Feature-Sliced Design provides a robust, scalable architecture for React/Next.js applications. Following its principles — layered architecture, downward-only imports, per-slice public APIs, and the v2.1 **Pages-First** decomposition — produces codebases that are maintainable, scalable, testable, and collaborative.

On **Next.js 16** the architecture is unchanged; what changed is the runtime around it — async request APIs, explicit opt-in caching (`use cache` / `updateTag` / `revalidateTag(tag, 'max')`), the `proxy.ts` rename, Turbopack-by-default, and React 19.2 + the React Compiler. The FSD placement of each (reads + `use cache` in the entity's `api/`, writes + cache-busting in the feature's `api/`) is what keeps those moving parts locatable.

The key to success is **discipline**: respect the import rule, keep the page as your starting point, extract down only when reuse is real, and let the structure grow with the app rather than ahead of it.

---

## Sources

**Feature-Sliced Design**
- [FSD — Layers reference (the six layers; `processes` deprecated)](https://feature-sliced.design/docs/reference/layers)
- [FSD v2.1 — "Pages come first"](https://github.com/feature-sliced/documentation/discussions/756)
- [FSD — Migration from v2.0 to v2.1](https://feature-sliced.design/docs/guides/migration/from-v2-0)
- [FSD — Slices and segments](https://feature-sliced.design/docs/reference/slices-segments)
- [FSD — Public API](https://feature-sliced.design/docs/reference/public-api)
- [FSD — Cross-imports & the `@x` notation](https://feature-sliced.design/docs/guides/issues/cross-imports)
- [FSD — Usage with Next.js](https://feature-sliced.design/docs/guides/tech/with-nextjs)
- [FSD — The Ultimate Next.js App Router Architecture](https://feature-sliced.design/blog/nextjs-app-router-guide)
- [FSD — Redux architecture 2025 (state-manager-as-coordinator)](https://feature-sliced.design/blog/redux-architecture-2025)
- [Steiger — the official FSD linter](https://github.com/feature-sliced/steiger)

**Next.js 16**
- [Next.js 16 — release blog](https://nextjs.org/blog/next-16)
- [Upgrading to Version 16 (async APIs, `proxy`, caching, Turbopack, removals)](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Migrating to Cache Components (`use cache`)](https://nextjs.org/docs/app/guides/migrating-to-cache-components)
- [`updateTag` — read-your-writes](https://nextjs.org/docs/app/api-reference/functions/updateTag)
- [`revalidateTag` — `cacheLife` second argument](https://nextjs.org/docs/app/api-reference/functions/revalidateTag)

