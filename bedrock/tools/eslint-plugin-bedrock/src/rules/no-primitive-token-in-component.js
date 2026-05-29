/**
 * bedrock/no-primitive-token-in-component
 *
 * Components reference SEMANTIC or COMPONENT tier tokens, never PRIMITIVE tier.
 * Per styling-and-tokens.md: primitives exist to feed semantics; consuming them
 * directly fights theming and breaks contrast guarantees.
 *
 * Catches:
 *   var(--color-blue-500), var(--space-4), var(--color-red-100) in JS/TS code
 *   (the file types ESLint sees). CSS files are out of ESLint's scope — pair
 *   this rule with the equivalent stylelint rule, or with the kit's
 *   check-token-coverage.sh fitness function for CSS coverage.
 *
 * Banned:
 *   const style = { color: 'var(--color-blue-500)' };       // primitive!
 *   <div style={{ background: 'var(--space-4)' }} />        // primitive!
 *
 * Allowed:
 *   const style = { color: 'var(--color-text-default)' };   // semantic
 *   <div style={{ background: 'var(--color-bg-emphasis)' }} />
 *
 * Configuration (options[0]):
 *
 *     primitivePatterns: array of regex strings (each matched against the token NAME,
 *       e.g. "--color-blue-500"). Defaults below cover the kit's illustrative scales.
 *
 * Tune `primitivePatterns` to the project's actual primitive naming
 * (Recon step — every kit has a unique scale). The defaults match the kit's
 * illustrative examples.
 */

const DEFAULT_PRIMITIVE_PATTERNS = [
  // Color scales: --color-<hue>-<step>
  '^--color-(blue|red|green|yellow|grey|gray|black|white|orange|purple|pink|teal|cyan)-\\d+$',
  // Spacing scale: --space-<index>
  '^--space-\\d+$',
  // Type scale: --font-size-<index>, --line-height-<index>, --font-weight-<index>
  '^--font-size-\\d+$',
  '^--line-height-\\d+$',
  '^--font-weight-\\d+$',
  // Radius scale: --radius-<index>
  '^--radius-\\d+$',
  // Z-index scale: --z-<index>
  '^--z-\\d+$',
];

function isPrimitiveTokenName(name, patterns) {
  return patterns.some((p) => new RegExp(p).test(name));
}

function extractVarRefs(str) {
  // Find all var(--token-name) references in a string.
  const refs = [];
  const re = /var\(\s*(--[a-zA-Z0-9_-]+)/g;
  let m;
  while ((m = re.exec(str)) !== null) {
    refs.push(m[1]);
  }
  return refs;
}

const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Forbid component references to primitive-tier design tokens; use semantic tokens instead.',
      category: 'Design Tokens',
      recommended: true,
      url: 'https://github.com/Zero-One-Stack/bedrock/blob/main/bedrock/rules/styling-and-tokens.md',
    },
    schema: [{
      type: 'object',
      properties: {
        primitivePatterns: { type: 'array', items: { type: 'string' } },
      },
      additionalProperties: false,
    }],
    messages: {
      primitiveTokenInComponent:
        "Primitive token '{{token}}' in component code. Use a SEMANTIC token (color-bg-*, color-text-*, space-inset-*) — primitives exist to feed semantics.",
    },
  },

  create(context) {
    const options = context.options[0] ?? {};
    const patterns = options.primitivePatterns ?? DEFAULT_PRIMITIVE_PATTERNS;

    function check(node, value) {
      if (typeof value !== 'string') return;
      const refs = extractVarRefs(value);
      for (const token of refs) {
        if (isPrimitiveTokenName(token, patterns)) {
          context.report({
            node,
            messageId: 'primitiveTokenInComponent',
            data: { token },
          });
        }
      }
    }

    return {
      Literal(node) {
        check(node, node.value);
      },
      TemplateElement(node) {
        check(node, node.value?.cooked);
      },
    };
  },
};

export default rule;
