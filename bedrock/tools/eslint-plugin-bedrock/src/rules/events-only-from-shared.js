/**
 * bedrock/events-only-from-shared
 *
 * The kit has ONE cross-slice event channel: the typed bus created in
 * `shared/lib/events/` (cross-slice-communication.md). A slice must NOT ship its
 * own emitter — no `mitt`/`eventemitter3`/`nanoevents`, no hand-rolled
 * `new EventTarget()` event bus — anywhere outside `shared/lib/events`. Slices
 * publish/subscribe by importing the bus DOWN through `@/shared/lib/events`, which
 * keeps import direction intact and the same-layer ban honored.
 *
 * This catches the structural violation (a rogue emitter in a slice). It does NOT
 * try to judge event-vs-compose-from-above — that's the reviewer's call.
 *
 * Banned (in any file NOT under shared/lib/events/):
 *   import mitt from 'mitt';
 *   import { EventEmitter } from 'eventemitter3';
 *   import { createNanoEvents } from 'nanoevents';
 *   const bus = new EventTarget();              // a hand-rolled bus
 *
 * Allowed:
 *   import { bus, useEvent } from '@/shared/lib/events';   // the sanctioned channel
 *   // anything inside shared/lib/events/** (that's where the bus is built)
 *
 * Configuration (options[0]):
 *   {
 *     "eventLibraries": ["mitt", "eventemitter3", "nanoevents", "eventemitter2"],
 *     "eventsDir": "shared/lib/events",   // the one place an emitter may be built
 *     "flagRawEventTarget": true          // also flag `new EventTarget()` outside eventsDir
 *   }
 */

const DEFAULT_LIBS = ['mitt', 'eventemitter3', 'nanoevents', 'eventemitter2', 'tiny-emitter'];
const DEFAULT_EVENTS_DIR = 'shared/lib/events';

const rule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Event emitters may only be constructed in shared/lib/events; slices use the bus via its public API.',
      category: 'Architecture',
      recommended: true,
      url: 'https://github.com/Zero-One-Stack/bedrock/blob/main/bedrock/rules/cross-slice-communication.md#the-mechanism--sharedlibevents',
    },
    schema: [{
      type: 'object',
      properties: {
        eventLibraries: { type: 'array', items: { type: 'string' } },
        eventsDir: { type: 'string' },
        flagRawEventTarget: { type: 'boolean' },
      },
      additionalProperties: false,
    }],
    messages: {
      emitterLibOutsideEvents:
        "Event-emitter library '{{lib}}' may only be imported in {{eventsDir}}/ — the kit has one bus. Publish/subscribe via '@/shared/lib/events' instead (cross-slice-communication.md).",
      rawEventTargetOutsideEvents:
        "A hand-rolled event bus (`new EventTarget()`) outside {{eventsDir}}/ is forbidden — use the shared bus via '@/shared/lib/events' (cross-slice-communication.md).",
    },
  },

  create(context) {
    const options = context.options[0] ?? {};
    const libs = options.eventLibraries ?? DEFAULT_LIBS;
    const eventsDir = options.eventsDir ?? DEFAULT_EVENTS_DIR;
    const flagRawEventTarget = options.flagRawEventTarget ?? true;

    // Normalize the current file path to forward slashes so the check works on Windows too.
    const filename = (context.filename ?? context.getFilename?.() ?? '').replace(/\\/g, '/');
    // A file is "inside the events dir" if its path contains `/<eventsDir>/` or starts with it.
    const insideEventsDir =
      filename.includes(`/${eventsDir}/`) || filename.startsWith(`${eventsDir}/`);

    // Inside shared/lib/events the bus IS built — every check is a no-op there.
    if (insideEventsDir) return {};

    const libSet = new Set(libs);

    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source !== 'string') return;
        if (libSet.has(source)) {
          context.report({
            node: node.source,
            messageId: 'emitterLibOutsideEvents',
            data: { lib: source, eventsDir },
          });
        }
      },

      NewExpression(node) {
        if (!flagRawEventTarget) return;
        if (node.callee && node.callee.type === 'Identifier' && node.callee.name === 'EventTarget') {
          context.report({
            node,
            messageId: 'rawEventTargetOutsideEvents',
            data: { eventsDir },
          });
        }
      },
    };
  },
};

export default rule;
