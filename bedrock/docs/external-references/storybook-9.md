# Storybook 9 — the kit's setup (CSF3 + autodocs + play + addon-a11y as CI gate)

**Verified against:** `storybook@9.x` and `@storybook/addon-a11y@9.x` (latest at 2026-05).
Storybook 9 unified the test surface — `@storybook/test-runner`, `@storybook/test`, and
`@storybook/experimental-addon-test` from v8 are now built-ins. Migrating from v8 mostly
means removing those deps.

## Minimum installation

```bash
# fresh project
pnpm create storybook@latest
# or in an existing repo:
pnpm dlx storybook@latest init
```

Required dev deps for the kit's contract (per `storybook.md`):

```bash
pnpm add -D \
  storybook @storybook/react @storybook/react-vite \
  @storybook/addon-essentials @storybook/addon-a11y @storybook/addon-interactions \
  @storybook/test @storybook/test-runner \
  chromatic                                # optional — see "visual regression" below
```

## `.storybook/main.ts` — the kit's required config

```ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: [
    '../src/**/*.mdx',
    '../src/**/*.stories.@(ts|tsx)',
  ],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
    '@storybook/addon-interactions',
  ],
  framework: { name: '@storybook/react-vite', options: {} },
  docs: { autodocs: 'tag' },              // autodocs only for stories tagged 'autodocs'
  staticDirs: ['../public'],
  typescript: { reactDocgen: 'react-docgen-typescript' },
};

export default config;
```

## `.storybook/preview.ts` — the theme × viewport × forced-colors × RTL matrix

The matrix lives **globally** so per-story stories don't override it. Per `storybook.md`,
this preview is the kit's contract — every component renders against the same axes.

```tsx
import type { Preview } from '@storybook/react';

const preview: Preview = {
  globalTypes: {
    theme:     { description: 'Theme',          defaultValue: 'light',   toolbar: { items: ['light', 'dark'] } },
    direction: { description: 'Text direction', defaultValue: 'ltr',     toolbar: { items: ['ltr', 'rtl'] } },
    brand:     { description: 'Brand',          defaultValue: 'default', toolbar: { items: ['default'] /* + per-repo brands */ } },
  },
  parameters: {
    viewport: {
      viewports: {
        mobile:  { name: 'Mobile (375)',   styles: { width: '375px',  height: '812px' } },
        tablet:  { name: 'Tablet (768)',   styles: { width: '768px',  height: '1024px' } },
        desktop: { name: 'Desktop (1280)', styles: { width: '1280px', height: '800px' } },
      },
    },
    backgrounds: { disable: true },          // theme decorator handles background
    a11y: { test: 'error' },                 // axe violations FAIL the story (not just warn)
  },
  decorators: [
    (Story, ctx) => {
      const { theme, direction, brand } = ctx.globals;
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.setAttribute('data-brand', brand);
      document.documentElement.setAttribute('dir', direction);
      return <Story />;
    },
  ],
};

export default preview;
```

> **Why `a11y: { test: 'error' }`.** The default is `'warn'` — violations show in the addon
> panel but don't fail the test runner. The kit's contract (`storybook.md`) is
> blocking-on-CI; without `test: 'error'`, addon-a11y is theater.

## CSF3 + autodocs (the per-story template)

```tsx
// shared/ui/atoms/button/button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';
import { DefaultProps, DisabledProps, LoadingProps } from './button.props';

const meta: Meta<typeof Button> = {
  title: 'Shared/Atoms/Button',           // FSD-mirrored title (see storybook.md)
  component: Button,
  tags: ['autodocs'],                     // generates the Docs page from this file
  parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = { args: { ...DefaultProps, intent: 'primary' } };
export const Subtle: Story = { args: { ...DefaultProps, intent: 'subtle' } };
export const Disabled: Story = { args: { ...DisabledProps } };
export const Loading: Story = { args: { ...LoadingProps } };
```

The `tags: ['autodocs']` is **mandatory** per the kit's contract.

## `play` functions (the test-runner integration)

The kit requires `play` on every interactive atom (`storybook.md`). `play` uses Testing
Library, runs in CI via `@storybook/test-runner`, and Chromatic captures the post-`play`
state for visual regression.

```tsx
import { userEvent, within, expect, fn } from '@storybook/test';

export const ClickHandler: Story = {
  args: { ...DefaultProps, onClick: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /save/i });
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};
```

**Always query by `getByRole` + accessible name**, never by `data-testid` or CSS selectors.
The `play` function is the kit's accessibility-by-construction check at runtime.

## Test runner setup (CI)

```bash
pnpm dlx playwright install --with-deps   # one-time per CI runner
```

`package.json` scripts the kit expects:

```jsonc
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build",
    "test-storybook": "test-storybook --maxWorkers=2"     // runs play() + axe on every story
  }
}
```

CI step:

```yaml
- name: Build Storybook
  run: pnpm build-storybook
- name: Test Storybook (play + axe)
  run: |
    pnpm dlx concurrently -k -s first -n "SB,TEST" \
      "pnpm dlx http-server storybook-static -p 6006 --silent" \
      "pnpm dlx wait-on http://127.0.0.1:6006 && pnpm test-storybook --url http://127.0.0.1:6006"
```

## Visual regression — Chromatic OR Playwright snapshots (pick one)

Chromatic auto-captures every story × every global combination (theme × direction ×
forced-colors × viewport):

```yaml
- name: Chromatic
  uses: chromaui/action@latest
  with:
    projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
```

Playwright snapshot route (no SaaS):

```ts
// tests/storybook-snapshots.spec.ts
import { test, expect } from '@playwright/test';

const stories = ['shared-atoms-button--primary', /* … */];

for (const id of stories) {
  test(`snapshot ${id}`, async ({ page }) => {
    await page.goto(`/iframe.html?id=${id}`);
    await expect(page).toHaveScreenshot();
  });
}
```

Per `storybook.md`: pick ONE — running both doubles the bill.

## Sources

- [Storybook 9 docs](https://storybook.js.org/docs)
- [CSF3 + autodocs](https://storybook.js.org/docs/writing-stories/autodocs)
- [`play` functions](https://storybook.js.org/docs/writing-stories/play-function)
- [addon-a11y (test mode)](https://storybook.js.org/docs/writing-tests/accessibility-testing)
- [test-runner](https://github.com/storybookjs/test-runner)
- [Chromatic](https://www.chromatic.com/)
