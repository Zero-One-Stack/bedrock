/**
 * bedrock/no-deep-slice-import
 *
 * Forbids deep imports past a slice's public-API barrier. Steiger catches this
 * tree-wide; this rule catches it as you type and on commit (faster feedback).
 *
 * Banned:
 *   import { EmployeeCard } from '@/entities/employee/ui/employee-card';
 *
 * Allowed:
 *   import { EmployeeCard } from '@/entities/employee';
 *   import type { Employee } from '@/entities/employee/@x/collective-agreement';
 *
 * Configuration (options[0]):
 *   {
 *     "slicedLayers": ["entities", "features", "widgets", "pages"],
 *     "alias": "@",                  // tsconfig path alias root
 *     "allowRoutingBarrel": true,    // permit `pages/<x>/routing` (per nextjs-app-router-fsd.md)
 *   }
 */

const DEFAULT_LAYERS = ['entities', 'features', 'widgets', 'pages'];
const SEGMENTS = ['ui', 'model', 'api', 'lib', 'config'];

const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: "Forbid deep imports past a slice's index.ts public-API barrier (FSD).",
      category: 'Architecture',
      recommended: true,
      url: 'https://github.com/Zero-One-Stack/bedrock/blob/main/bedrock/rules/feature-sliced-design.md#the-public-api-barrier-the-slices-contract',
    },
    schema: [{
      type: 'object',
      properties: {
        slicedLayers: { type: 'array', items: { type: 'string' } },
        alias: { type: 'string' },
        allowRoutingBarrel: { type: 'boolean' },
      },
      additionalProperties: false,
    }],
    messages: {
      deepImport:
        "Deep import past slice's public API: '{{source}}'. Import from '{{slice}}' (the slice's index.ts) instead.",
      deepImportEntity:
        "Deep import past entity '{{slice}}'. Use the slice's index.ts, or @x/{{consumer}} for a cross-entity domain link.",
    },
  },

  create(context) {
    const options = context.options[0] ?? {};
    const layers = options.slicedLayers ?? DEFAULT_LAYERS;
    const alias = options.alias ?? '@';
    const allowRoutingBarrel = options.allowRoutingBarrel ?? true;

    // Build a regex matching <alias>/<layer>/<slice>/<segment>/...
    // Examples that should match:
    //   @/entities/employee/ui/Card
    //   ~/features/file-grievance/model/schema
    //   @/pages/home/api/queries
    const aliasEscaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const layerGroup = layers.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const segmentGroup = SEGMENTS.join('|');
    const deepPattern = new RegExp(
      `^${aliasEscaped}/(${layerGroup})/([^/]+)/(${segmentGroup})(?:/|$)`,
    );

    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source !== 'string') return;

        // Allow the dedicated routing.ts barrel introduced by nextjs-app-router-fsd.md
        if (allowRoutingBarrel && /\/(?:pages)\/[^/]+\/routing(?:\.ts)?$/.test(source)) {
          return;
        }

        const m = deepPattern.exec(source);
        if (!m) return;

        const [, layer, slice] = m;
        const sliceBarrel = `${alias}/${layer}/${slice}`;

        if (layer === 'entities') {
          context.report({
            node: node.source,
            messageId: 'deepImportEntity',
            data: { slice: sliceBarrel, consumer: '<consumer-name>' },
          });
        } else {
          context.report({
            node: node.source,
            messageId: 'deepImport',
            data: { source, slice: sliceBarrel },
          });
        }
      },
    };
  },
};

export default rule;
