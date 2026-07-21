# Rule: Design-system structure — every component is a self-contained folder

> **The one-sentence rule:** in `shared/ui`, a component is a **folder** named in kebab-case,
> living under its atomic level (`atoms/` · `molecules/` · `organisms/`), containing **every
> file that concerns it** — implementation, props fixtures, test, and story — so updating a
> component means opening exactly one directory.

This is the layout an agent applies **by default, without asking**. It exists so that a repo
that installs this kit gets the same design-system shape every time, and so a component's test
and story can never drift away from the component they describe.

`component-structure.md` owns the general file-per-concern contract for *any* FSD layer; this
file is authoritative for the **`shared/ui` design system** specifically — the atomic grouping,
the folder-not-flat-file rule, and the tooling that has to agree with it.

---

## 1. The shape

```
src/shared/ui/
├── atoms/
│   ├── button/
│   │   ├── index.ts                 # public surface of THIS component
│   │   ├── button.tsx               # implementation + exported props type
│   │   ├── button.props.ts          # named fixtures, imported by BOTH test and story
│   │   ├── button.variants.ts       # variant recipe — only if it has size/intent/tone
│   │   ├── button.module.css        # styles (or the repo's engine equivalent)
│   │   ├── button.test.tsx          # colocated — Testing Library + axe
│   │   └── button.stories.tsx       # colocated — CSF3 + autodocs
│   ├── input/
│   └── icon/
├── molecules/
│   └── field/                       # Label + Input + ErrorText
└── organisms/
    └── data-table/
```

**Non-negotiables:**

1. **A folder, never a bare file.** `shared/ui/atoms/button.tsx` is a violation; it must be
   `shared/ui/atoms/button/button.tsx`. A flat file has nowhere to put its siblings, which is
   how test/story drift starts.
2. **The test lives in the folder.** Not in a parallel `tests/` tree. When you change
   `button.tsx`, its test is the file next to it — you cannot miss it.
3. **The story lives in the folder.** Same reason.
4. **`index.ts` exports only this component's public surface** — no `export *`.
5. **kebab-case** for the folder and every file in it; **PascalCase** for the React export.
6. **The folder name matches the file stem** — `button/button.tsx`, never `button/index.tsx`
   as the implementation (an `index.ts` that re-exports is fine and required).

## 2. Which atomic folder?

Decide by **shape**, using the heuristics table in `component-structure.md` § "Heuristics —
atom / molecule / organism". Short form:

| Level | Test | Example |
| --- | --- | --- |
| **atom** | One semantic element + variants. Renders no other named component of yours. | `Button`, `Input`, `Icon`, `Badge`, `Spinner` |
| **molecule** | ≤3 atoms, one purpose. | `Field` (Label+Input+Error), `SearchBar` |
| **organism** | Composes molecules, owns state across subcomponents, has layout regions. | `DataTable`, `NavBar`, `Dialog` |

**If it carries business meaning, it does not belong in `shared/ui` at all** — it goes to
`entities/`, `features/`, or `widgets/` by FSD boundary, regardless of its atomic shape. A
component that knows what an "employee" is is not a shared atom.

Genuinely ambiguous between two levels? Pick the **lower** one and move it up if it grows.
Moving `atoms/x/` → `molecules/x/` is a folder rename plus one barrel edit, because everything
that concerns it travels together.

## 3. The trap: your test runner must actually see these tests

**Colocating tests is worthless if the runner's glob excludes them.** A repo whose test script
is bound to a separate tree — for example:

```jsonc
// package.json — the failure mode
"test:unit": "tsx --test tests/unit/*.test.ts"   // ← a colocated button.test.tsx NEVER RUNS
```

…will happily report green while every colocated test is invisible. A test that passes by not
existing is worse than no test, because it reads as coverage.

**Therefore, whenever this structure is adopted, the runner config MUST include the component
tree.** Verify it in Step 0 Recon and fix it in the same change:

```jsonc
// vitest.config.ts (or the repo's runner) — include BOTH trees during migration
test: {
  include: [
    'src/**/*.{test,spec}.{ts,tsx}',   // ← colocated component tests
    'tests/**/*.{test,spec}.{ts,tsx}', // ← existing suites, if any
  ],
}
```

**Proof, not assumption:** after wiring, add a deliberately failing assertion inside one
colocated test and confirm the suite goes red. If it stays green, the glob is still wrong. Then
revert the assertion. Do not report colocated testing as working without this check.

Related: the E2E layer is unaffected — user-journey specs stay in the E2E directory per
`testing.md`. This rule governs unit/integration tests only.

## 4. What goes in each file

| File | Contains | Required? |
| --- | --- | --- |
| `index.ts` | `export { Button } from './button'` + its types | Always |
| `<name>.tsx` | The component + its exported props type | Always |
| `<name>.props.ts` | Named fixtures shared by test and story | When props are non-trivial |
| `<name>.test.tsx` | Testing Library, behavior-not-implementation, one axe assertion | Always |
| `<name>.stories.tsx` | CSF3, `tags: ['autodocs']`, a story per meaningful state | Always |
| `<name>.variants.ts` | The variant recipe | Only with size/intent/tone variants |
| `<name>.module.css` | Styles, tokens only | Per the repo's styling engine |
| `<name>.behavior.ts` | Extracted interaction hook | Only when logic outgrows the `.tsx` |

A trivial wrapper may collapse to `index.ts` + `<name>.tsx` + `<name>.test.tsx` +
`<name>.stories.tsx`. **The test and the story are never the files you drop** — they are the
point of the folder.

## 5. The barrel chain

```ts
// shared/ui/atoms/button/index.ts  — this component's surface
export { Button, type ButtonProps } from './button';

// shared/ui/index.ts — the slice's public API (what the rest of the app may import)
export { Button, type ButtonProps } from './atoms/button';
export { Field } from './molecules/field';
```

Consumers import `@/shared/ui`, never `@/shared/ui/atoms/button/button`. A sibling inside
`shared/ui` imports the other component by its **leaf path** (`../icon`), never through the
slice's own root barrel — that is how barrel re-export loops start
(`component-structure.md` § circular dependencies).

## 6. Enforcement

| Layer | What catches a violation |
| --- | --- |
| Scaffolding | `/bedrock:scaffold-component` emits the full folder — the easy path is the correct one |
| ESLint | `bedrock/component-folder-contract` — flags a bare component file in `shared/ui`, a folder missing its test or story, and a mis-cased name |
| Skill | `/bedrock:audit-design-system` — sweeps the whole design system and reports gaps |
| Reviewer | `frontend-reviewer` checks placement and the file set on the diff |

The ESLint rule is the deterministic gate; the audit skill is the periodic sweep. Neither can
tell you a component sits at the *wrong atomic level* — that is a judgment call the heuristics
table informs and a reviewer makes.

## 7. Adopting this in a repo that is flat today

Do **not** flip the whole design system at once, and do not treat the existing flat layout as
the repo's convention (see the override note in `component-structure.md`).

1. Fix the **test-runner glob first** (§3), so colocated tests run the moment they appear.
2. Promote **one component** as the reference: create the folder, move the implementation, move
   the story in beside it, write the missing test, update the `shared/ui` barrel.
3. Enable `bedrock/component-folder-contract` as a **warning**, then promote to `error` for new
   files once the backlog is paid down — a ratchet that only tightens.
4. Migrate the rest opportunistically: any component you touch gets promoted in that PR.

`/bedrock:migrate-to-kit` drives this. The barrel means consumers never change during the move.

## 8. Hard rules

- ❌ A component as a **bare file** in `shared/ui` (no folder).
- ❌ A component folder with **no `*.test.tsx`** or **no `*.stories.tsx`**.
- ❌ Unit tests for a component living in a **separate top-level tree** instead of beside it.
- ❌ Adopting colocated tests **without** widening the runner glob to include them.
- ❌ `export *` from a component or slice barrel.
- ❌ A **business-bearing** component in `shared/ui` — it belongs to a slice that owns its meaning.
- ✅ Ambiguous atomic level → pick lower, promote later.
- ✅ Deviations are dated *Approved overrides*, never silent adaptation.
