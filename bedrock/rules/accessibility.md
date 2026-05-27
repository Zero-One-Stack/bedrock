# Rule: Accessibility (WCAG 2.2 AA)

> **Non-negotiable.** Every UI ships **WCAG 2.2 Level AA**. Accessibility is a build
> requirement, not a later pass. AA is the legal bar in most jurisdictions (Section 508,
> EN 301 549, AODA) — treat it as the floor.

## Why

The cheapest, highest-impact accessibility tool is **semantic HTML** — it gives roles, keyboard
behavior, and focus for free. ARIA patches what semantics can't express; it never replaces them.
We enforce a11y three ways: **at authoring** (these rules), **at lint** (`eslint-plugin-jsx-a11y`),
and **in tests/Storybook** (`jest-axe` + `@storybook/addon-a11y`).

## The rules

### 1. Semantic HTML first
- Use the real element: `<button>` for actions, `<a href>` for navigation, `<nav>/<main>/
  <header>/<footer>/<section>/<article>`, `<ul>/<ol>/<li>`, `<table>` for tabular data.
- Never `onClick` a `<div>`/`<span>` for an action. If you must, add `role`, `tabIndex={0}`,
  and key handlers — but first ask why it isn't a `<button>`.
- One `<h1>` per page; heading levels don't skip (`h1→h2→h3`).
- Inputs have an associated `<label htmlFor>` (or `aria-label`/`aria-labelledby`). Placeholder is not a label.

### 2. Keyboard (WCAG 2.1.1, 2.1.2)
- Everything operable by mouse is operable by keyboard. Logical tab order (DOM order); no positive `tabIndex`.
- No keyboard traps. Modals/drawers: focus moves in on open, returns to the trigger on close, and
  is trapped within while open. `Escape` closes.
- Standard keys work: Enter/Space activate, arrows for composite widgets (menus, tabs, radios), Escape dismisses.

### 3. Focus visibility & management (WCAG 2.4.7, **2.4.11 new in 2.2**)
- **Visible focus indicator** on every interactive element — never `outline: none` without a
  replacement. Use a token (`--focus-ring`) for the focus style.
- Focused element must not be fully hidden by sticky headers/overlays (2.2 *Focus Not Obscured*).
- Move focus deliberately on route change / dialog open; announce async page changes.

### 4. Target size (**WCAG 2.5.8 new in 2.2**, AA)
- Interactive targets **≥ 24×24 CSS px** minimum (AA). **Design target ≥ 44×44** (Apple) / **48×48**
  (Google) for primary touch controls — see `responsive-design.md`. Provide spacing between adjacent targets.

### 5. Color & contrast (WCAG 1.4.3, 1.4.11)
- Text contrast **≥ 4.5:1** (≥ 3:1 for large text ≥ 24px/18.66px-bold). UI components & graphical
  objects **≥ 3:1** against adjacent colors.
- **Never convey meaning by color alone** — pair with text, icon, or pattern (e.g. an error has an
  icon + message, not just a red border). Contrast is a property of the **semantic tokens**; verify token pairs.

### 6. Forms & errors (WCAG 3.3.1, 3.3.2, 1.3.1)
- Errors are programmatically associated: `aria-invalid` on the field + `aria-describedby` →
  the message; message in `role="alert"`/a live region so it's announced.
- A submit that fails surfaces an **error summary** at the top that links to each invalid field. Don't rely on inline-only.
- Required fields marked in text/`aria-required`, not just a colored asterisk.

### 7. Images, icons, media
- Meaningful images: descriptive `alt`. Decorative: `alt=""` (or `aria-hidden`). Icon-only buttons need `aria-label`.
- Don't put essential info only in an image of text.

### 8. Motion & animation (WCAG 2.3.3, 2.2.2)
- Respect **`prefers-reduced-motion`** — gate non-essential animation/parallax/auto-play; provide a
  reduced/no-motion path. Nothing flashes > 3×/sec. See `responsive-design.md` for the media-query pattern.
- Auto-playing/looping/moving content > 5s can be paused/stopped/hidden.

### 9. Live regions & dynamic content
- Async updates (toasts, loading→loaded, validation) use `aria-live` (`polite` default, `assertive` only for urgent).
- Loading states are announced, not just spinners.

## Tooling (configure in every project)

- **Lint:** `eslint-plugin-jsx-a11y` (recommended ruleset) — fails CI on violations.
- **Tests:** `jest-axe` — assert `expect(await axe(container)).toHaveNoViolations()` on each
  component, in addition to behavior tests. Plus keyboard-path tests with `userEvent.tab()`.
- **Storybook:** `@storybook/addon-a11y` runs axe on every story; treat findings as defects.
- **Manual:** keyboard-only pass + a screen-reader smoke test (VoiceOver/NVDA) on key flows before merge.

```tsx
// component-name.test.tsx — a11y assertion alongside behavior
import { axe } from 'jest-axe';
import { render } from '@/test-utils';
import { InputFieldWrapper } from './input-field.composition';
import { DefaultInputFieldProps } from './input-field.props';

it('has no axe violations', async () => {
  const { container } = render(<InputFieldWrapper {...DefaultInputFieldProps} />);
  expect(await axe(container)).toHaveNoViolations();
});
```

## Hard rules

- ❌ `<div onClick>` for actions; `outline: none` without a visible replacement.
- ❌ Meaning by color alone; placeholder used as the only label.
- ❌ Keyboard traps; focus lost or never returned after a dialog.
- ❌ Animation that ignores `prefers-reduced-motion`.
- ✅ Semantic element first, ARIA only to fill gaps; visible focus via token; errors announced and associated.
- ✅ jsx-a11y + jest-axe + addon-a11y wired; keyboard + SR smoke test on key flows.

## Checklist (per component / per flow)
- [ ] Correct semantic element; headings in order.
- [ ] Fully keyboard-operable; visible focus; focus managed for overlays; Escape works.
- [ ] Targets ≥ 24px (≥44/48 for touch); spacing between targets.
- [ ] Contrast AA on token pairs; no color-only meaning.
- [ ] Errors associated + announced; error summary on submit failure.
- [ ] `alt`/`aria-label` correct; reduced-motion respected.
- [ ] `jest-axe` clean; addon-a11y clean; keyboard + SR pass.

## Sources
- [WCAG 2.2 (W3C Recommendation)](https://www.w3.org/TR/WCAG22/)
- [WAI — WCAG 2.2 overview & what's new](https://www.w3.org/WAI/standards-guidelines/wcag/)
- [Web Accessibility in 2026 — EAA/ADA/WCAG dev guide](https://www.codewithseb.com/blog/web-accessibility-2026-eaa-ada-wcag-guide)
