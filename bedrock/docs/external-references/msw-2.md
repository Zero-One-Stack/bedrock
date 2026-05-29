# Mock Service Worker 2.x — the kit's mocking pattern

**Verified against:** `msw@2.x` (latest at 2026-05). v2 was a complete API rewrite from v1 —
copying a v1 example into a v2 project is the most common cause of "rest is not a function"
errors. Verify the installed major in Recon.

## v1 vs v2 — what changed (everything)

| v1 | v2 |
| --- | --- |
| `import { rest } from 'msw'` | `import { http, HttpResponse } from 'msw'` |
| `rest.get(url, (req, res, ctx) => res(ctx.json(data)))` | `http.get(url, () => HttpResponse.json(data))` |
| `ctx.status(500)` | `HttpResponse.json(body, { status: 500 })` |
| `ctx.delay(200)` | `await delay(200)` then return `HttpResponse.json(...)` |
| `req.params.id` | `({ params }) => params.id` |
| `req.url.searchParams.get('q')` | `({ request }) => new URL(request.url).searchParams.get('q')` |
| `req.json()` | `await request.json()` |
| `setupWorker(...handlers)` | `setupWorker(...handlers)` (same name, but accepts the new `http.*` shape) |

**If a snippet uses `rest.*`, it's v1.** Don't try to translate by editing — start from the
v2 shape; the mental model differs more than the names.

## Setup — handlers, server (Node), worker (browser)

### Handlers (the kit's per-entity convention)

The kit colocates handlers with the entity in `entities/<x>/api/<x>.msw.ts`:

```ts
// entities/grievance/api/grievance.msw.ts
import { http, HttpResponse } from 'msw';
import { ENDPOINTS } from './grievance.endpoints';
import { mockGrievances } from './grievance.mock';

export const grievanceHandlers = [
  http.get(ENDPOINTS.LIST, () => {
    return HttpResponse.json(mockGrievances);
  }),

  http.get(ENDPOINTS.BY_ID(':id'), ({ params }) => {
    const found = mockGrievances.find((g) => g.id === params.id);
    if (!found) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(found);
  }),

  http.post(ENDPOINTS.CREATE, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ ...body, id: 'new-id' }, { status: 201 });
  }),
];
```

### Test setup (Node — Jest/Vitest)

```ts
// src/test-utils/msw-server.ts
import { setupServer } from 'msw/node';
import { grievanceHandlers } from '@/entities/grievance/api/grievance.msw';
import { employeeHandlers } from '@/entities/employee/api/employee.msw';

export const server = setupServer(
  ...grievanceHandlers,
  ...employeeHandlers,
);
```

```ts
// vitest.setup.ts (or jest.setup.ts)
import { server } from '@/test-utils/msw-server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());        // critical — see "per-test override" below
afterAll(() => server.close());
```

`onUnhandledRequest: 'error'` is the kit's default — a real fetch in tests is almost always
a missing handler, and silent passthrough hides the problem until production.

### Browser worker (Storybook, dev)

```ts
// src/test-utils/msw-browser.ts
import { setupWorker } from 'msw/browser';      // NOT 'msw' — different entry in v2
import { grievanceHandlers } from '@/entities/grievance/api/grievance.msw';

export const worker = setupWorker(...grievanceHandlers);
```

Storybook integration via `msw-storybook-addon`:

```ts
// .storybook/preview.ts
import { initialize, mswLoader } from 'msw-storybook-addon';
initialize();

export default {
  loaders: [mswLoader],
  parameters: {
    msw: { handlers: [...grievanceHandlers] },
  },
};
```

## Per-test handler override

Tests routinely need a different response shape (404, slow, error). Override on top of the
default handlers — `resetHandlers()` in `afterEach` cleans up automatically.

```ts
import { http, HttpResponse } from 'msw';
import { server } from '@/test-utils/msw-server';

it('shows the empty state when the API returns 404', async () => {
  server.use(
    http.get(ENDPOINTS.LIST, () => new HttpResponse(null, { status: 404 })),
  );
  // … render + assert empty state
});

it('shows a loading skeleton during slow requests', async () => {
  server.use(
    http.get(ENDPOINTS.LIST, async () => {
      await delay(500);
      return HttpResponse.json(mockGrievances);
    }),
  );
  // … assert skeleton, then resolved content
});
```

`server.use(...)` ADDS handlers in front of the default chain; `resetHandlers()` removes
the added ones at the next `afterEach`.

## Common gotchas

- **`fetch` not defined in Node test runner.** v2 ships ESM-only and needs a `fetch` polyfill
  in Node < 18. Use Node 18+ in CI (the kit's recommendation regardless).
- **`onUnhandledRequest: 'warn'` vs `'error'`.** The default in `setupServer` is `'warn'`.
  The kit overrides to `'error'` so a missing handler fails the test instead of silently
  hitting the network.
- **Headers in handlers** — `request.headers` is a `Headers` object, not an object literal.
  Use `request.headers.get('content-type')`.
- **Query params** — `new URL(request.url).searchParams` is the only way to read them in v2.
- **No `ctx.delay` anymore** — `import { delay } from 'msw'` and `await delay(ms)`.

## `delay` (the v2 replacement for `ctx.delay`)

```ts
import { http, HttpResponse, delay } from 'msw';

http.get('/api/slow', async () => {
  await delay(200);
  return HttpResponse.json({ ok: true });
});
```

## Sources

- [MSW v2 docs](https://mswjs.io/docs/)
- [Migration guide v1 → v2](https://mswjs.io/docs/migrations/1.x-to-2.x)
- [`msw-storybook-addon`](https://storybook.js.org/addons/msw-storybook-addon)
