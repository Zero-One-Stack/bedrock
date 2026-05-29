# Zod — the patterns the kit uses (v3 vs v4)

**Verified against:** `zod@3.x` and `zod@4.x` (latest at 2026-05). The v3→v4 API moved
several string-format helpers; copying a v3 example into a v4 project is the most common
source of "type X is not a function" errors. Verify the installed major in Recon
(`package.json` → `zod` version).

## The kit's defining use cases for Zod

1. **Entity schema** — the source-of-truth for a domain model (`entities/<x>/model/<x>.ts`).
2. **Form schema** — the validation contract for a feature's form
   (`features/<x>/model/schema.ts`).
3. **Boundary validation** — every transport response (`shared/api/`, entity `api/`) is
   `.parse()`ed before crossing into typed code.
4. **Env validation** — `shared/config/env.{server,client}.ts` parses `process.env` so a
   missing variable fails the build, not a 3am crash (per `security.md`).

## Defining schemas (the kit's canonical entity)

```ts
import { z } from 'zod';

export const GrievanceSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  filedAt: z.string().datetime(),       // v3: .datetime() / v4: z.iso.datetime() — see below
  filedBy: z.string().uuid(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type Grievance = z.infer<typeof GrievanceSchema>;
```

## v3 vs v4 — the differences the kit cares about

| Concept | v3 | v4 |
| --- | --- | --- |
| ISO datetime string | `z.string().datetime()` | **`z.iso.datetime()`** |
| ISO date string | `z.string().date()` | `z.iso.date()` |
| ISO time string | `z.string().time()` | `z.iso.time()` |
| UUID | `z.string().uuid()` | `z.uuid()` (top-level) |
| Email | `z.string().email()` | `z.email()` (top-level) |
| URL | `z.string().url()` | `z.url()` (top-level) |
| Record | `z.record(z.unknown())` (one arg) | `z.record(z.string(), z.unknown())` (two args required) |
| Error format | `error.format()` returns nested object | `z.treeifyError(error)` (new in v4) |
| `safeParse` shape | `{ success, data \| error }` | unchanged |
| `parse` (throws) | unchanged | unchanged |
| `z.infer` | unchanged | unchanged |

**Migration guide:** [zod.dev/migration](https://zod.dev/migration). The `z.iso.*` move
covers ~80% of breakage.

## `parse` vs `safeParse` (when to use which)

```ts
// parse — throws on invalid; use at trust boundaries where bad input is exceptional
const data = GrievanceSchema.parse(await res.json());   // throws if API returns garbage

// safeParse — returns a result discriminated union; use when you handle the error inline
const result = GrievanceSchema.safeParse(input);
if (!result.success) {
  // result.error.issues is an array of { path, message, code }
  return { error: result.error.flatten() };
}
const data = result.data;
```

The kit's pattern: **`.parse()` at transport boundaries** (entity `*.api.ts` after
`fetch`); **`.safeParse()` in code that already handles errors** (RHF resolver, server-action
validation that returns a `{ error }` object on bad input).

## Coercing types at the schema layer

`z.coerce.*` lets the schema accept multiple input shapes and produce one typed output.
The kit's RSC↔Client boundary rule (`services-and-data.md`) sometimes uses this for Dates.

```ts
const Filter = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
  filedAfter: z.coerce.date().optional(),       // accepts string or Date, outputs Date
});

// Input: { page: '2', size: '50', filedAfter: '2026-01-01' }
// Output: { page: 2,  size: 50,   filedAfter: Date }
```

## RHF integration (the kit's form pattern — see also `react-hook-form.md`)

```ts
// features/file-grievance/model/schema.ts
import { z } from 'zod';

export const CreateGrievanceSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  severity: z.enum(['low', 'medium', 'high'], { required_error: 'Pick a severity' }),
});

export type CreateGrievanceInput = z.infer<typeof CreateGrievanceSchema>;
```

Then in the feature's component:

```ts
const { control, handleSubmit } = useForm<CreateGrievanceInput>({
  resolver: zodResolver(CreateGrievanceSchema),
});
```

`@hookform/resolvers/zod` handles the bridge — Zod's `safeParse` errors become RHF's
`formState.errors` shape automatically.

## Server-side env parsing (`shared/config/env.server.ts`)

```ts
import 'server-only';
import { z } from 'zod';

const ServerEnv = z.object({
  DATABASE_URL: z.string().url(),
  STRIPE_SECRET_KEY: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
});

// Throws at module load if any value is missing or wrong-shaped.
// This fails the BUILD, not a runtime page render.
export const env = ServerEnv.parse(process.env);
```

The throw is intentional: the kit's `security.md` mandates that bad env should be a build
failure, not a 3am production crash. Don't catch the parse error here.

## Sources

- [Zod docs (v4)](https://zod.dev/)
- [v3 → v4 migration guide](https://zod.dev/migration)
- [`@hookform/resolvers/zod`](https://github.com/react-hook-form/resolvers#zod)
