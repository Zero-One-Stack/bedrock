import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeTester } from './_helpers.js';
import rule from '../src/rules/component-folder-contract.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Real on-disk fixtures — the sibling test/story checks read the filesystem, so these
// cases can't be expressed with synthetic paths.
const FIX = path.join(__dirname, 'fixtures/src/shared/ui');

const tester = makeTester();
const CODE = 'export function C() { return null; }';

tester.run('bedrock/component-folder-contract', rule, {
  valid: [
    // Complete component folder: impl + test + story.
    { filename: path.join(FIX, 'atoms/button/button.tsx'), code: CODE },

    // A subcomponent inside a component folder isn't required to have its own
    // test/story — only the folder's primary component is.
    { filename: path.join(FIX, 'organisms/data-table/table-pagination.tsx'), code: CODE },

    // Non-component files in the design system are ignored.
    { filename: path.join(FIX, 'atoms/button/button.test.tsx'), code: CODE },
    { filename: path.join(FIX, 'atoms/button/button.stories.tsx'), code: CODE },
    { filename: path.join(FIX, 'atoms/badge/badge.props.ts'), code: 'export const p = {};' },

    // Outside the design system this rule says nothing — a bare feature file is fine.
    { filename: '/repo/src/features/file-grievance/ui/form.tsx', code: CODE },
    { filename: '/repo/src/entities/employee/ui/employee-card.tsx', code: CODE },

    // Sibling checks can be turned off for a repo with a dated override.
    {
      filename: path.join(FIX, 'atoms/badge/badge.tsx'),
      code: CODE,
      options: [{ checkTest: false, checkStory: false }],
    },

    // Unreadable/virtual path: FS checks are skipped rather than firing false positives.
    { filename: '/nonexistent/src/shared/ui/atoms/ghost/ghost.tsx', code: CODE },
  ],

  invalid: [
    // Bare file directly in an atomic folder — the headline violation.
    {
      filename: path.join(FIX, 'atoms/button.tsx'),
      code: CODE,
      errors: [{ messageId: 'bareComponentFile' }],
    },
    // Bare file directly in shared/ui.
    {
      filename: path.join(FIX, 'toast.tsx'),
      code: CODE,
      errors: [{ messageId: 'bareComponentFile' }],
    },
    // Folder exists but the test AND story are missing.
    {
      filename: path.join(FIX, 'atoms/badge/badge.tsx'),
      code: CODE,
      errors: [{ messageId: 'missingTest' }, { messageId: 'missingStory' }],
    },
    // Folder has a test but no story.
    {
      filename: path.join(FIX, 'molecules/field/field.tsx'),
      code: CODE,
      errors: [{ messageId: 'missingStory' }],
    },
    // Non-kebab-case bare file: casing + bare-file both reported.
    {
      filename: path.join(FIX, 'atoms/DatePicker.tsx'),
      code: CODE,
      errors: [{ messageId: 'badCasing' }, { messageId: 'bareComponentFile' }],
    },
  ],
});

console.log('component-folder-contract: PASS');
