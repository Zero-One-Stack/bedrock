import { makeTester } from './_helpers.js';
import rule from '../src/rules/require-server-only-on-queries.js';

const tester = makeTester();

tester.run('bedrock/require-server-only-on-queries', rule, {
  valid: [
    // Correct: import 'server-only'; at the top
    {
      filename: '/repo/src/entities/employee/api/employee.queries.ts',
      code: "import 'server-only';\nimport { fetchEmployees } from './employee.api';\nexport const listEmployees = () => fetchEmployees();",
    },
    // Correct: also valid with comment block above
    {
      filename: '/repo/entities/grievance/api/grievance.queries.ts',
      code: "// SPDX-License-Identifier: MIT\nimport 'server-only';\nexport const x = 1;",
    },
    // Not a queries.ts → rule doesn't apply
    {
      filename: '/repo/src/entities/employee/api/employee.api.ts',
      code: "export const fetchEmployees = () => fetch('/api');",
    },
    {
      filename: '/repo/src/entities/employee/api/employee.hooks.ts',
      code: "'use client';\nexport const useEmployees = () => null;",
    },
    // shared/api isn't an entity
    {
      filename: '/repo/src/shared/api/client.ts',
      code: "export const client = {};",
    },
  ],
  invalid: [
    {
      filename: '/repo/src/entities/employee/api/employee.queries.ts',
      code: "import { fetchEmployees } from './employee.api';\nexport const listEmployees = () => fetchEmployees();",
      errors: [{ messageId: 'missingServerOnly' }],
      output: "import 'server-only';\nimport { fetchEmployees } from './employee.api';\nexport const listEmployees = () => fetchEmployees();",
    },
    // Flat layout (no src/)
    {
      filename: '/repo/entities/grievance/api/grievance.queries.ts',
      code: "export const listGrievances = () => null;",
      errors: [{ messageId: 'missingServerOnly' }],
      output: "import 'server-only';\nexport const listGrievances = () => null;",
    },
    // Comment in place of import doesn't satisfy the rule
    {
      filename: '/repo/src/entities/x/api/x.queries.ts',
      code: "// TODO: add 'server-only' later\nexport const x = 1;",
      errors: [{ messageId: 'missingServerOnly' }],
      output: "// TODO: add 'server-only' later\nimport 'server-only';\nexport const x = 1;",
    },
  ],
});

console.log('require-server-only-on-queries: PASS');
