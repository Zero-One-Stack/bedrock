/**
 * bedrock/no-use-client-at-page-top
 *
 * `'use client'` is forbidden at the top of:
 *   - root Next.js route files:  <root>/app/**∕page.{ts,tsx,js,jsx}
 *   - FSD page slice screens:    src/pages/<route>/ui/<X>Page.{tsx,jsx}
 *
 * Push it to the interactive feature/widget leaf instead.
 *
 * The PreToolUse hook enforces this at write-time (Write only). This rule
 * enforces it for existing code, refactors, and Edit-shaped changes the hook
 * can't see whole-file.
 *
 * Configuration (options[0]):
 *   {
 *     "routePagePattern": "[/\\\\]app[/\\\\](.*[/\\\\])?page\\.(tsx|ts|jsx|js)$",
 *     "fsdPageScreenPattern": "[/\\\\]src[/\\\\]pages[/\\\\][^/\\\\]+[/\\\\]ui[/\\\\][^/\\\\]+Page\\.(tsx|jsx)$",
 *   }
 */

const DEFAULT_ROUTE = '[/\\\\]app[/\\\\](.*[/\\\\])?page\\.(tsx|ts|jsx|js)$';
const DEFAULT_FSD_PAGE = '[/\\\\]src[/\\\\]pages[/\\\\][^/\\\\]+[/\\\\]ui[/\\\\][^/\\\\]+Page\\.(tsx|jsx)$';

const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: "Forbid 'use client' at the top of a Next.js route or an FSD page slice screen.",
      category: 'Architecture',
      recommended: true,
      url: 'https://github.com/Zero-One-Stack/bedrock/blob/main/bedrock/rules/feature-sliced-design.md',
    },
    schema: [{
      type: 'object',
      properties: {
        routePagePattern: { type: 'string' },
        fsdPageScreenPattern: { type: 'string' },
      },
      additionalProperties: false,
    }],
    messages: {
      useClientAtPageTop:
        "'use client' at the top of a page/route — push it to the interactive feature/widget leaf.",
    },
  },

  create(context) {
    const filename = context.filename ?? context.getFilename();
    const options = context.options[0] ?? {};
    const routePattern = new RegExp(options.routePagePattern ?? DEFAULT_ROUTE);
    const fsdPattern = new RegExp(options.fsdPageScreenPattern ?? DEFAULT_FSD_PAGE);

    if (!routePattern.test(filename) && !fsdPattern.test(filename)) {
      return {};
    }

    return {
      Program(node) {
        // Find the first non-comment statement; if it's a `'use client'` directive, fail.
        // ESLint's AST surfaces directives as ExpressionStatement nodes with a `directive`
        // field on the parsed string.
        for (const stmt of node.body) {
          if (stmt.type === 'ExpressionStatement' && typeof stmt.directive === 'string') {
            if (stmt.directive === 'use client') {
              context.report({ node: stmt, messageId: 'useClientAtPageTop' });
            }
            // Other directives ('use server', 'use strict') are fine to ignore; we only
            // care about 'use client' here.
            continue;
          }
          // First real statement reached — stop scanning.
          break;
        }
      },
    };
  },
};

export default rule;
