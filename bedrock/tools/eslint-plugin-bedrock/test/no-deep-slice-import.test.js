import { makeTester } from './_helpers.js';
import rule from '../src/rules/no-deep-slice-import.js';

const tester = makeTester();

tester.run('bedrock/no-deep-slice-import', rule, {
  valid: [
    // Slice barrel imports are fine
    "import { EmployeeCard } from '@/entities/employee';",
    "import { FileGrievanceForm } from '@/features/file-grievance';",
    "import { Dashboard } from '@/widgets/grievance-dashboard';",
    // @x cross-imports on entities are NOT deep imports — they're the documented escape hatch
    "import type { Employee } from '@/entities/employee/@x/collective-agreement';",
    // shared/* is allowed at any depth (no slices)
    "import { cx } from '@/shared/lib/cx';",
    "import { Icon } from '@/shared/ui/atoms/icon';",
    // routing barrel for the page slice (per nextjs-app-router-fsd.md)
    "import { HomePage } from '@/pages/home/routing';",
    // External packages
    "import { useQuery } from '@tanstack/react-query';",
    // Relative imports (intra-slice) — not the rule's concern
    "import { helper } from '../lib/helper';",
  ],
  invalid: [
    {
      code: "import { EmployeeCard } from '@/entities/employee/ui/employee-card';",
      errors: [{ messageId: 'deepImportEntity' }],
    },
    {
      code: "import { schema } from '@/features/file-grievance/model/schema';",
      errors: [{ messageId: 'deepImport' }],
    },
    {
      code: "import { Dashboard } from '@/widgets/grievance-dashboard/ui/dashboard';",
      errors: [{ messageId: 'deepImport' }],
    },
    {
      code: "import { metadata } from '@/pages/home/model/metadata';",
      errors: [{ messageId: 'deepImport' }],
    },
  ],
});

console.log('no-deep-slice-import: PASS');
