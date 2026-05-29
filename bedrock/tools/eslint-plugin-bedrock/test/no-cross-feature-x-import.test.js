import { makeTester } from './_helpers.js';
import rule from '../src/rules/no-cross-feature-x-import.js';

const tester = makeTester();

tester.run('bedrock/no-cross-feature-x-import', rule, {
  valid: [
    // Entities @x is the sanctioned use
    "import type { Employee } from '@/entities/employee/@x/collective-agreement';",
    "import { sharedType } from '@/entities/grievance/@x/employee';",
    // Slice barrels are fine
    "import { x } from '@/features/file-grievance';",
    // Non-@x imports on forbidden layers are fine (those are policed by no-deep-slice-import)
    "import { x } from '@/features/file-grievance/ui/Form';",
    // External
    "import { useQuery } from '@tanstack/react-query';",
  ],
  invalid: [
    {
      code: "import { x } from '@/features/file-grievance/@x/resolve-dispute';",
      errors: [{ messageId: 'forbiddenLayerX', data: { layer: 'features' } }],
    },
    {
      code: "import { x } from '@/widgets/grievance-dashboard/@x/employee';",
      errors: [{ messageId: 'forbiddenLayerX', data: { layer: 'widgets' } }],
    },
    {
      code: "import { x } from '@/pages/home/@x/about';",
      errors: [{ messageId: 'forbiddenLayerX', data: { layer: 'pages' } }],
    },
  ],
});

console.log('no-cross-feature-x-import: PASS');
