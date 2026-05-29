import { makeTester } from './_helpers.js';
import rule from '../src/rules/no-use-client-at-page-top.js';

const tester = makeTester();

tester.run('bedrock/no-use-client-at-page-top', rule, {
  valid: [
    // Server Component page (no directive)
    {
      filename: '/repo/app/home/page.tsx',
      code: "export default function Page() { return null; }",
    },
    // FSD page screen as RSC
    {
      filename: '/repo/src/pages/home/ui/HomePage.tsx',
      code: "export function HomePage() { return null; }",
    },
    // 'use client' on a feature leaf is allowed
    {
      filename: '/repo/src/features/file-grievance/ui/file-grievance-form.tsx',
      code: "'use client';\nexport function FileGrievanceForm() { return null; }",
    },
    // 'use client' on a widget leaf is allowed
    {
      filename: '/repo/src/widgets/grievance-dashboard/ui/Dashboard.tsx',
      code: "'use client';\nexport function Dashboard() { return null; }",
    },
    // Page sub-leaf (not the screen file) is allowed
    {
      filename: '/repo/src/pages/home/ui/sections/Header.tsx',
      code: "'use client';\nexport function Header() { return null; }",
    },
    // app/page.tsx without 'use client'
    {
      filename: '/repo/app/page.tsx',
      code: "export default function Page() { return null; }",
    },
  ],
  invalid: [
    {
      filename: '/repo/app/home/page.tsx',
      code: "'use client';\nexport default function Page() { return null; }",
      errors: [{ messageId: 'useClientAtPageTop' }],
    },
    {
      filename: '/repo/app/page.tsx',
      code: "'use client';\nexport default function Page() { return null; }",
      errors: [{ messageId: 'useClientAtPageTop' }],
    },
    {
      filename: '/repo/src/pages/home/ui/HomePage.tsx',
      code: "'use client';\nexport function HomePage() { return null; }",
      errors: [{ messageId: 'useClientAtPageTop' }],
    },
    // Deep nested app route
    {
      filename: '/repo/app/dashboard/reports/[id]/page.tsx',
      code: "'use client';\nexport default function Page() { return null; }",
      errors: [{ messageId: 'useClientAtPageTop' }],
    },
    // app/page.jsx
    {
      filename: '/repo/app/page.jsx',
      code: "'use client';\nexport default function Page() { return null; }",
      errors: [{ messageId: 'useClientAtPageTop' }],
    },
  ],
});

console.log('no-use-client-at-page-top: PASS');
