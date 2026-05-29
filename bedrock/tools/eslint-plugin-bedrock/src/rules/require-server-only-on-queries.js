/**
 * bedrock/require-server-only-on-queries
 *
 * Entity *.queries.ts files MUST begin with `import 'server-only';`. The
 * PreToolUse hook enforces this at write-time (Write only); this rule
 * enforces it for existing code and for Edits the hook intentionally allows
 * (per the partial-Edit false-positive guard).
 *
 * Catches: any file whose path matches `entities/<x>/api/<x>.queries.{ts,js}`
 * that lacks the top-of-file `import 'server-only';`.
 *
 * Configuration (options[0]):
 *   {
 *     "filePattern": "[/\\\\]entities[/\\\\][^/\\\\]+[/\\\\]api[/\\\\][^/\\\\]+\\.queries\\.(ts|js)$",
 *   }
 *
 * Default pattern matches both src/-wrapped and flat repo layouts, JS and TS.
 */

const DEFAULT_FILE_PATTERN = '[/\\\\]entities[/\\\\][^/\\\\]+[/\\\\]api[/\\\\][^/\\\\]+\\.queries\\.(ts|js)$';

const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: "Entity *.queries.ts must declare `import 'server-only';`.",
      category: 'Security',
      recommended: true,
      url: 'https://github.com/Zero-One-Stack/bedrock/blob/main/bedrock/rules/services-and-data.md',
    },
    fixable: 'code',
    schema: [{
      type: 'object',
      properties: {
        filePattern: { type: 'string' },
      },
      additionalProperties: false,
    }],
    messages: {
      missingServerOnly:
        "Entity queries.ts must declare `import 'server-only';` at the top — prevents client-bundle leak of secrets/DB calls.",
    },
  },

  create(context) {
    const filename = context.filename ?? context.getFilename();
    const options = context.options[0] ?? {};
    const filePattern = new RegExp(options.filePattern ?? DEFAULT_FILE_PATTERN);

    if (!filePattern.test(filename)) {
      return {};
    }

    return {
      Program(node) {
        // Look for `import 'server-only'` (or `"server-only"`) anywhere in the top-level body.
        // Convention says first import; we're lenient on placement — Next.js only requires
        // it to be present, and a strict line-1 check would false-positive on license
        // comment blocks at the top of the file.
        const hasServerOnly = node.body.some((stmt) =>
          stmt.type === 'ImportDeclaration' &&
          typeof stmt.source.value === 'string' &&
          stmt.source.value === 'server-only'
        );

        if (!hasServerOnly) {
          context.report({
            node,
            messageId: 'missingServerOnly',
            fix(fixer) {
              return fixer.insertTextBefore(node.body[0] ?? node, "import 'server-only';\n");
            },
          });
        }
      },
    };
  },
};

export default rule;
