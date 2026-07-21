/**
 * bedrock/component-folder-contract
 *
 * In the design system (`shared/ui`), a component is a FOLDER that owns every file
 * concerning it — implementation, props, test, and story. See
 * rules/design-system-structure.md.
 *
 * This rule reports three things:
 *
 *   1. bareComponentFile — a component .tsx sitting directly in shared/ui (or directly
 *      in an atomic folder) instead of inside its own component folder.
 *          shared/ui/atoms/button.tsx        ✗
 *          shared/ui/atoms/button/button.tsx ✓
 *
 *   2. missingTest / missingStory — a component folder whose sibling test or story file
 *      is absent. This is what stops a component from drifting away from its coverage.
 *
 *   3. badCasing — a folder or file that isn't kebab-case.
 *
 * WHY A LINT RULE AND NOT JUST THE AUDIT SKILL: the skill sweeps on demand; this fires
 * in the editor and on commit, so the contract is enforced at the moment the file is
 * created rather than discovered later.
 *
 * NOTE ON FILESYSTEM ACCESS: checking for a sibling test/story requires reading the
 * directory. ESLint rules may do this, but it makes the rule I/O-bound, so results are
 * memoized per directory for the lifetime of the process. `missingTest`/`missingStory`
 * can be disabled via options if a project's runner genuinely keeps tests elsewhere
 * (a dated override per governance.md — not a free choice).
 *
 * Configuration (options[0]):
 *   {
 *     "designSystemPattern": "[/\\\\]shared[/\\\\]ui[/\\\\]",
 *     "checkTest": true,
 *     "checkStory": true,
 *     "checkCasing": true,
 *     "testSuffixes": [".test.tsx", ".test.ts", ".spec.tsx", ".spec.ts"],
 *     "storySuffixes": [".stories.tsx", ".stories.ts"]
 *   }
 */
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_DS_PATTERN = '[/\\\\]shared[/\\\\]ui[/\\\\]';
const DEFAULT_TEST_SUFFIXES = ['.test.tsx', '.test.ts', '.spec.tsx', '.spec.ts'];
const DEFAULT_STORY_SUFFIXES = ['.stories.tsx', '.stories.ts'];

// Folders that group components rather than being components themselves.
const ATOMIC_FOLDERS = new Set(['atoms', 'molecules', 'organisms', 'templates', 'ui']);

// Files that live in a component folder but aren't the component itself.
const NON_COMPONENT_SUFFIXES = [
  '.test.tsx', '.test.ts', '.spec.tsx', '.spec.ts',
  '.stories.tsx', '.stories.ts',
  '.props.ts', '.variants.ts', '.behavior.ts', '.styles.ts',
  '.module.css', '.css',
  '.types.ts', '.constants.ts', '.utils.ts', '.mock.ts', '.mocks.ts',
];

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Memoized directory listing — this rule is I/O-bound without it. */
const dirCache = new Map();
function readDir(dir) {
  if (dirCache.has(dir)) return dirCache.get(dir);
  let entries = [];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    entries = []; // unreadable/virtual path (editor buffers, tests) → skip the FS checks
  }
  dirCache.set(dir, entries);
  return entries;
}

function isNonComponentFile(base) {
  return NON_COMPONENT_SUFFIXES.some((s) => base.endsWith(s)) || base.startsWith('index.');
}

const rule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Enforce the design-system component-folder contract: each shared/ui component is a kebab-case folder owning its implementation, test, and story.',
      category: 'Architecture',
      recommended: true,
      url: 'https://github.com/Zero-One-Stack/bedrock/blob/main/bedrock/rules/design-system-structure.md',
    },
    schema: [{
      type: 'object',
      properties: {
        designSystemPattern: { type: 'string' },
        checkTest: { type: 'boolean' },
        checkStory: { type: 'boolean' },
        checkCasing: { type: 'boolean' },
        testSuffixes: { type: 'array', items: { type: 'string' } },
        storySuffixes: { type: 'array', items: { type: 'string' } },
      },
      additionalProperties: false,
    }],
    messages: {
      bareComponentFile:
        "Component '{{name}}' is a bare file in the design system. Move it to '{{suggested}}/' so its test and story live beside it (design-system-structure.md).",
      missingTest:
        "Component folder '{{name}}' has no colocated test file. Add '{{name}}.test.tsx' in this folder — a component and its test must travel together.",
      missingStory:
        "Component folder '{{name}}' has no colocated story file. Add '{{name}}.stories.tsx' in this folder.",
      badCasing:
        "'{{name}}' is not kebab-case. Design-system folders and files use kebab-case (e.g. 'date-picker').",
    },
  },

  create(context) {
    const filename = context.filename ?? context.getFilename();
    const options = context.options[0] ?? {};
    const dsPattern = new RegExp(options.designSystemPattern ?? DEFAULT_DS_PATTERN);

    // Only govern files inside the design system.
    if (!dsPattern.test(filename)) return {};

    const base = path.basename(filename);
    const ext = path.extname(base);

    // Only .tsx/.jsx implementation files are candidates; skip tests, stories, props, css…
    if (ext !== '.tsx' && ext !== '.jsx') return {};
    if (isNonComponentFile(base)) return {};

    const stem = base.slice(0, -ext.length);
    const dir = path.dirname(filename);
    const dirName = path.basename(dir);

    const checkTest = options.checkTest !== false;
    const checkStory = options.checkStory !== false;
    const checkCasing = options.checkCasing !== false;
    const testSuffixes = options.testSuffixes ?? DEFAULT_TEST_SUFFIXES;
    const storySuffixes = options.storySuffixes ?? DEFAULT_STORY_SUFFIXES;

    return {
      // Report once per file, anchored at the top of the Program node.
      Program(node) {
        if (checkCasing && !KEBAB.test(stem)) {
          context.report({ node, messageId: 'badCasing', data: { name: base } });
        }

        // A component file whose parent directory is an atomic/grouping folder (or
        // shared/ui itself) is a BARE FILE — it has no folder of its own.
        const isBare = ATOMIC_FOLDERS.has(dirName);
        if (isBare) {
          context.report({
            node,
            messageId: 'bareComponentFile',
            data: { name: base, suggested: `${dirName}/${stem}` },
          });
          // No point checking for siblings — the folder doesn't exist yet.
          return;
        }

        // Otherwise the file is inside its own component folder. The folder name should
        // match the file stem; if it doesn't, this is likely a subcomponent (e.g.
        // data-table/table-pagination.tsx), which is allowed — only the folder's primary
        // component is required to have a test and story.
        if (dirName !== stem) return;

        if (checkCasing && !KEBAB.test(dirName)) {
          context.report({ node, messageId: 'badCasing', data: { name: dirName } });
        }

        if (!checkTest && !checkStory) return;

        const entries = readDir(dir);
        // Empty listing means the path isn't readable (virtual file, RuleTester); the
        // sibling checks would produce false positives, so skip them.
        if (entries.length === 0) return;

        if (checkTest && !testSuffixes.some((s) => entries.includes(`${stem}${s}`))) {
          context.report({ node, messageId: 'missingTest', data: { name: stem } });
        }
        if (checkStory && !storySuffixes.some((s) => entries.includes(`${stem}${s}`))) {
          context.report({ node, messageId: 'missingStory', data: { name: stem } });
        }
      },
    };
  },
};

export default rule;
