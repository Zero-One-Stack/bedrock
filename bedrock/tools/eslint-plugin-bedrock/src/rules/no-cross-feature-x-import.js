/**
 * bedrock/no-cross-feature-x-import
 *
 * The @x cross-import notation is for the entities layer ONLY. A `features/*∕@x/`,
 * `widgets/*∕@x/`, or `pages/*∕@x/` segment is a misuse — those layers resolve
 * shared dependencies by compose-from-above, push-down, or merge, never @x.
 *
 * Catches both:
 *   1. An import path containing `/features/<x>/@x/`, `/widgets/.../@x/`, `/pages/.../@x/`
 *   2. (via path-based check in the linter's caller) a file LIVING at one of those paths
 *      — but file-existence is a Steiger concern, not an import-time one. This rule
 *      focuses on imports.
 *
 * Banned:
 *   import { x } from '@/features/resolve-dispute/@x/file-grievance';
 *
 * Allowed:
 *   import type { Employee } from '@/entities/employee/@x/collective-agreement';
 *
 * Configuration (options[0]):
 *   {
 *     "alias": "@",
 *     "forbiddenLayers": ["features", "widgets", "pages"],
 *   }
 */

const DEFAULT_FORBIDDEN = ['features', 'widgets', 'pages'];

const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: '@x cross-imports are allowed only on the entities layer.',
      category: 'Architecture',
      recommended: true,
      url: 'https://github.com/Zero-One-Stack/bedrock/blob/main/bedrock/rules/feature-sliced-design.md#the-one-same-layer-escape-hatch-x-cross-imports-entities-only',
    },
    schema: [{
      type: 'object',
      properties: {
        alias: { type: 'string' },
        forbiddenLayers: { type: 'array', items: { type: 'string' } },
      },
      additionalProperties: false,
    }],
    messages: {
      forbiddenLayerX:
        "@x cross-import on '{{layer}}' is forbidden — the @x notation is entities-only. Resolve via compose-from-above, push-down, or merge (feature-sliced-design.md).",
    },
  },

  create(context) {
    const options = context.options[0] ?? {};
    const alias = options.alias ?? '@';
    const forbidden = options.forbiddenLayers ?? DEFAULT_FORBIDDEN;

    const aliasEscaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const layerGroup = forbidden.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    // Match: <alias>/<layer>/<slice>/@x/anything OR a relative ../layer/<slice>/@x path.
    // We're conservative — only flag aliased paths to avoid false positives on legitimate
    // entities/@x relative imports inside the entities layer.
    const aliasedPattern = new RegExp(`^${aliasEscaped}/(${layerGroup})/[^/]+/@x/`);
    // Also match path-style imports that don't go through the alias (Nx / monorepo cases):
    //   '@scope/features-file-grievance/@x/...' — too varied to catch reliably; rely on
    //   Steiger for those. Aliased is the 95% case.

    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source !== 'string') return;

        const m = aliasedPattern.exec(source);
        if (!m) return;

        context.report({
          node: node.source,
          messageId: 'forbiddenLayerX',
          data: { layer: m[1] },
        });
      },
    };
  },
};

export default rule;
