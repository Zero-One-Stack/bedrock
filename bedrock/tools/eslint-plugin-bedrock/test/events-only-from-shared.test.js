import { makeTester } from './_helpers.js';
import rule from '../src/rules/events-only-from-shared.js';

const tester = makeTester();

tester.run('bedrock/events-only-from-shared', rule, {
  valid: [
    // The bus itself is built inside shared/lib/events — every check is a no-op there.
    {
      code: "import mitt from 'mitt'; const bus = new EventTarget();",
      filename: 'src/shared/lib/events/bus.ts',
    },
    {
      code: "const target = new EventTarget();",
      filename: 'src/shared/lib/events/bus.ts',
    },
    // A slice consuming the sanctioned channel is fine.
    {
      code: "import { bus, useEvent } from '@/shared/lib/events';",
      filename: 'src/features/file-grievance/ui/form.tsx',
    },
    // Unrelated imports in a slice are fine.
    {
      code: "import { useQuery } from '@tanstack/react-query';",
      filename: 'src/features/file-grievance/model/use-file-grievance.ts',
    },
    // EventTarget usage that isn't `new EventTarget()` (e.g. extending in shared) — only `new` is flagged,
    // and only outside the events dir; a node addEventListener call is untouched.
    {
      code: "el.addEventListener('click', onClick);",
      filename: 'src/shared/ui/atoms/button/button.tsx',
    },
  ],
  invalid: [
    // A feature shipping its own emitter library.
    {
      code: "import mitt from 'mitt';",
      filename: 'src/features/resolve-dispute/model/bus.ts',
      errors: [{ messageId: 'emitterLibOutsideEvents', data: { lib: 'mitt', eventsDir: 'shared/lib/events' } }],
    },
    {
      code: "import { EventEmitter } from 'eventemitter3';",
      filename: 'src/widgets/grievance-dashboard/model/emitter.ts',
      errors: [{ messageId: 'emitterLibOutsideEvents' }],
    },
    {
      code: "import { createNanoEvents } from 'nanoevents';",
      filename: 'src/features/file-grievance/model/events.ts',
      errors: [{ messageId: 'emitterLibOutsideEvents' }],
    },
    // A hand-rolled EventTarget bus in a slice.
    {
      code: "const bus = new EventTarget();",
      filename: 'src/features/file-grievance/model/bus.ts',
      errors: [{ messageId: 'rawEventTargetOutsideEvents' }],
    },
    // Both at once.
    {
      code: "import mitt from 'mitt'; const t = new EventTarget();",
      filename: 'src/entities/employee/model/bus.ts',
      errors: [
        { messageId: 'emitterLibOutsideEvents' },
        { messageId: 'rawEventTargetOutsideEvents' },
      ],
    },
  ],
});

console.log('events-only-from-shared: PASS');
