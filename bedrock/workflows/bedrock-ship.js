export const meta = {
  name: 'bedrock-ship',
  description:
    'Ship a frontend change end-to-end against the bedrock constitution: recon → plan → build each unit bottom-up → verify → review → auto-fix, looping until the gates pass.',
  whenToUse:
    'Any non-trivial frontend change in a bedrock project (new feature, widget, entity, page, or multi-component refactor). Skip for a typo or a one-line fix.',
  phases: [
    { title: 'Recon', detail: 'read the constitution + repo facts; fill the Step 0 Recon block' },
    { title: 'Plan', detail: 'six-section FSD build plan, decomposed into ordered units' },
    { title: 'Build', detail: 'one agent per unit, bottom-up in FSD import order' },
    { title: 'Verify', detail: 'typecheck/lint/test/Steiger/dep-cruiser via the repo scripts' },
    { title: 'Review', detail: 'constitution review of the diff' },
    { title: 'Fix', detail: 'apply blocking findings, then re-verify' },
  ],
}

// ---------------------------------------------------------------------------
// bedrock-ship — the kit's four-phase working cadence, executed as one run.
//
// This is the scripted form of rules/working-cadence.md. The cadence used to be
// a rhythm the user drove by hand: /architect, then a scaffold per unit, then
// /verify-build, then /fe-review, re-prompting at every arrow. Here the script
// holds the loop, so the plan survives between phases instead of living in
// chat scrollback where it drifts.
//
// Installed by /bedrock:kit-init into <project>/.claude/workflows/.
// Plugins cannot ship workflows directly — they load only from a project's
// .claude/workflows/ or ~/.claude/workflows/.
// ---------------------------------------------------------------------------

const TASK =
  typeof args === 'string'
    ? args
    : args && args.task
      ? args.task
      : args
        ? JSON.stringify(args)
        : null

if (!TASK) {
  return {
    error:
      'No task given. Run: /bedrock-ship <what to build>, e.g. "/bedrock-ship add a billing-history widget to the account page".',
  }
}

// Tunables — args can override without editing the script.
const MAX_FIX_ROUNDS = (args && args.maxFixRounds) || 3
const SKIP_REVIEW = Boolean(args && args.skipReview)

const CONSTITUTION = `
You are working in a project governed by the bedrock engineering constitution.
Read .claude/CLAUDE.md and the relevant .claude/rules/*.md BEFORE acting. Hard rules
that apply to every phase:
- Step 0 Recon is a gate: never invent a package script, import alias, token name, or
  test-utils path. Read package.json / tsconfig.json / the real token source.
- Feature-Sliced Design: imports go downward only (app→pages→widgets→features→entities→shared);
  no same-layer slice imports (except an @x cross-import on entities); no deep import past a
  slice's index.ts.
- Server/client boundaries: entity *.queries.ts needs 'server-only'; feature *.action.ts needs
  'use server'; never 'use client' at the top of a page.
- No 'any', no unverified token names, no hardcoded user-facing strings.
- The repo's reality beats any example in the docs. If the repo conflicts with the
  constitution, flag it — do not silently adapt.
`.trim()

// --- Phase 1: Recon ---------------------------------------------------------
// Done once, up front, and threaded into every later prompt. Subagents don't
// inherit conversation context, so facts discovered here must travel explicitly.

phase('Recon')

const RECON_SCHEMA = {
  type: 'object',
  required: ['packageManager', 'scripts', 'aliases', 'stylingEngine', 'summary'],
  properties: {
    packageManager: { type: 'string' },
    scripts: {
      type: 'object',
      description: 'Real script names from package.json',
      properties: {
        lint: { type: 'string' },
        typecheck: { type: 'string' },
        test: { type: 'string' },
        e2e: { type: 'string' },
        build: { type: 'string' },
        tokens: { type: 'string' },
      },
    },
    testRunner: { type: 'string', description: 'jest | vitest | none' },
    aliases: { type: 'string', description: 'tsconfig path aliases, e.g. @/* -> src/*' },
    stylingEngine: { type: 'string' },
    testUtilsPath: { type: 'string' },
    existingSlices: { type: 'array', items: { type: 'string' } },
    conflicts: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string', description: 'The Step 0 Recon block, verbatim' },
  },
}

const recon = await agent(
  `${CONSTITUTION}

TASK CONTEXT (do not implement it yet): ${TASK}

Perform the Step 0 Repo Reconnaissance gate from .claude/CLAUDE.md. Read, never guess:
1. .claude/rules/project-specifics.md first — if its Recon cache is filled, reuse it and
   only re-check lines that look stale.
2. package.json "scripts" — record the REAL names for lint/typecheck/test/e2e/build/tokens.
   If a script does not exist, return an empty string for it. Never invent one.
3. tsconfig.json compilerOptions.paths for import aliases.
4. The styling engine actually in use, and the token source if there is one.
5. The existing FSD slices under src/ (or the repo's equivalent), so the plan reuses
   rather than duplicates.
6. Any repo fact that violates the constitution — report, don't fix.

Return the filled Recon block plus the structured fields.`,
  { schema: RECON_SCHEMA, label: 'recon' },
)

if (!recon) {
  return { error: 'Recon failed — cannot plan safely without repo facts. Nothing was changed.' }
}

const RECON_CONTEXT = `
VERIFIED REPO FACTS (from Step 0 Recon — trust these over any example in the docs):
${recon.summary}
Package manager: ${recon.packageManager}
Real scripts: ${JSON.stringify(recon.scripts)}
Test runner: ${recon.testRunner || 'unknown'}
Import aliases: ${recon.aliases}
Styling engine: ${recon.stylingEngine}
Existing slices: ${(recon.existingSlices || []).join(', ') || 'none found'}
`.trim()

log(`Recon complete — ${recon.packageManager}, ${recon.stylingEngine}, runner=${recon.testRunner || 'n/a'}`)
if (recon.conflicts && recon.conflicts.length) {
  log(`⚠ ${recon.conflicts.length} constitution conflict(s) found in the repo — surfaced in the report.`)
}

// --- Phase 2: Plan ----------------------------------------------------------
// The architect decomposes into ORDERED UNITS. This is the artifact the old
// manual cadence lost between phases; here it stays in a script variable.

phase('Plan')

const PLAN_SCHEMA = {
  type: 'object',
  required: ['units', 'scopeSummary'],
  properties: {
    scopeSummary: { type: 'string' },
    outOfScope: { type: 'array', items: { type: 'string' } },
    dataPlan: { type: 'string' },
    boundaryPlan: { type: 'string' },
    units: {
      type: 'array',
      description: 'Build units in bottom-up FSD order: shared → entities → features → widgets → pages → route',
      items: {
        type: 'object',
        required: ['id', 'kind', 'layer', 'path', 'instruction'],
        properties: {
          id: { type: 'string' },
          kind: {
            type: 'string',
            description: 'token | service-read | service-write | component | test | e2e | route-wiring',
          },
          layer: { type: 'string', description: 'shared | entities | features | widgets | pages | app' },
          path: { type: 'string', description: 'Target slice/segment path' },
          instruction: { type: 'string', description: 'Self-contained build instruction for one agent' },
          reuses: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    risks: { type: 'array', items: { type: 'string' } },
    needsAdr: { type: 'boolean' },
  },
}

const plan = await agent(
  `${CONSTITUTION}

${RECON_CONTEXT}

TASK: ${TASK}

Act as the frontend-architect. Read .claude/rules/architecture.md,
feature-sliced-design.md, component-structure.md, and services-and-data.md, then produce
the six-section build plan — scope & decomposition, data & state plan, render & boundary
plan, component inventory, build order, risks.

Then FLATTEN the build order into discrete units. Rules for units:
- Order them bottom-up in the FSD import direction so every dependency exists before its
  consumer: shared → entities → features → widgets → pages → route wiring.
- Each unit must be independently buildable by one agent that has NOT seen this
  conversation. Put every fact it needs in its "instruction" — target path, what it
  renders/does, which existing slices it may import, which tokens to use.
- Prefer REUSE: if an existing slice already covers a unit, say so in "reuses" and drop it.
- Do not over-slice. Single-use UI stays in the page; a speculative slice used 0–1 times
  is a violation.
- Include test units only where the repo has a test runner (${recon.testRunner || 'none found'}).

You are planning only — write NO code.`,
  { schema: PLAN_SCHEMA, label: 'architect' },
)

if (!plan || !plan.units || plan.units.length === 0) {
  return {
    error: 'Planning produced no build units.',
    recon: recon.summary,
    plan: plan || null,
  }
}

log(`Plan: ${plan.units.length} unit(s) — ${plan.units.map(u => u.id).join(', ')}`)
if (plan.needsAdr) log('⚠ Plan flags an architectural decision — an ADR is warranted (/bedrock:adr).')

// --- Phase 3: Build ---------------------------------------------------------
// Sequential on purpose. FSD units depend on the ones below them, and parallel
// writers would race on the same slice index.ts public API.

phase('Build')

const built = []
for (let i = 0; i < plan.units.length; i++) {
  const unit = plan.units[i]
  const priorContext = built.length
    ? `Already built in this run (import from these rather than recreating):\n${built
        .map(b => `- ${b.id} (${b.layer}) at ${b.path}: ${b.whatWasBuilt || 'built'}`)
        .join('\n')}`
    : 'Nothing built yet in this run — this is the first unit.'

  const result = await agent(
    `${CONSTITUTION}

${RECON_CONTEXT}

OVERALL TASK: ${TASK}
PLAN SCOPE: ${plan.scopeSummary}

${priorContext}

BUILD UNIT ${i + 1} of ${plan.units.length} — ${unit.id}
Kind:  ${unit.kind}
Layer: ${unit.layer}
Path:  ${unit.path}
${unit.reuses && unit.reuses.length ? `Reuse: ${unit.reuses.join(', ')}` : ''}

INSTRUCTION:
${unit.instruction}

Build exactly this unit — do not expand scope into other units; they are handled
separately. Follow the kit's file-per-concern contract for components, and export through
the slice's public API index.ts. Use only token names and scripts verified in the repo
facts above.

If this unit turns out to be impossible as specified (a missing dependency, a placement
question the plan did not answer), do NOT improvise a different design — return
blocked=true with the reason so the run can replan.`,
    {
      label: `build:${unit.id}`,
      schema: {
        type: 'object',
        required: ['filesWritten', 'whatWasBuilt'],
        properties: {
          filesWritten: { type: 'array', items: { type: 'string' } },
          whatWasBuilt: { type: 'string' },
          blocked: { type: 'boolean' },
          blockedReason: { type: 'string' },
          notes: { type: 'string' },
        },
      },
    },
  )

  if (!result) {
    built.push({ ...unit, whatWasBuilt: 'AGENT FAILED', failed: true })
    log(`✗ ${unit.id} — agent failed`)
    continue
  }
  built.push({ ...unit, ...result })
  log(
    result.blocked
      ? `⚠ ${unit.id} blocked: ${result.blockedReason}`
      : `✓ ${unit.id} — ${(result.filesWritten || []).length} file(s)`,
  )
}

const blocked = built.filter(b => b.blocked || b.failed)

// --- Phase 4/5/6: Verify → Review → Fix, looping ----------------------------
// The mechanical gate and the judgement gate, with a bounded repair loop. This
// is the arrow the manual cadence never automated.

const VERIFY_SCHEMA = {
  type: 'object',
  required: ['passed', 'failures'],
  properties: {
    passed: { type: 'boolean' },
    ranCommands: { type: 'array', items: { type: 'string' } },
    failures: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          gate: { type: 'string' },
          detail: { type: 'string' },
          file: { type: 'string' },
        },
      },
    },
    skipped: { type: 'array', items: { type: 'string' } },
  },
}

const REVIEW_SCHEMA = {
  type: 'object',
  required: ['verdict', 'findings'],
  properties: {
    verdict: { type: 'string', description: 'pass | changes-requested' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['severity', 'summary'],
        properties: {
          severity: { type: 'string', description: 'blocker | should-fix | nit' },
          summary: { type: 'string' },
          file: { type: 'string' },
          rule: { type: 'string' },
          fix: { type: 'string' },
        },
      },
    },
  },
}

const verifyPrompt = `${CONSTITUTION}

${RECON_CONTEXT}

Run the repo's REAL verification scripts — only ones that exist in the recon facts above;
never invent a script name. Cover what is available: typecheck, lint, unit tests, build,
and the FSD architecture linters (Steiger / dependency-cruiser) if configured.

Report each gate that failed with enough detail to fix it. If a gate does not exist in
this repo, list it under "skipped" rather than failing the run. Do NOT fix anything —
this is the measurement pass only.`

let verify = await agent(verifyPrompt, { label: 'verify', phase: 'Verify', schema: VERIFY_SCHEMA })

let review = null
let fixRounds = 0
const fixLog = []

// A round = (fix what verify/review found) → re-verify. Bounded so a pathological
// failure can't spin forever; the run reports honestly if it exits still red.
while (fixRounds < MAX_FIX_ROUNDS) {
  const verifyFailed = !verify || !verify.passed

  // Review only once the build is mechanically sound — reviewing broken code wastes a pass.
  if (!verifyFailed && !SKIP_REVIEW && !review) {
    phase('Review')
    review = await agent(
      `${CONSTITUTION}

${RECON_CONTEXT}

Act as the frontend-reviewer. Review the changes made in this run against the
constitution: FSD placement and the import rules, the component file contract, the
styling engine recorded in project-specifics.md, React Query / RHF+Zod usage, the testing
rules, strict TypeScript, accessibility (WCAG 2.2 AA), i18n, and the hard bans.

Files changed in this run:
${built.flatMap(b => b.filesWritten || []).join('\n') || '(none recorded)'}

Group findings by severity (blocker / should-fix / nit), each with file, the rule it
breaks, and the fix. Verdict is "changes-requested" if there is any blocker, else "pass".
Review only — do not edit files.`,
      { label: 'review', phase: 'Review', schema: REVIEW_SCHEMA },
    )
  }

  const blockers = review ? (review.findings || []).filter(f => f.severity === 'blocker') : []
  if (!verifyFailed && blockers.length === 0) break

  fixRounds++
  phase('Fix')

  const work = [
    ...(verifyFailed && verify ? (verify.failures || []).map(f => `[${f.gate}] ${f.file || ''} ${f.detail}`) : []),
    ...blockers.map(f => `[review:${f.rule || 'constitution'}] ${f.file || ''} ${f.summary} → ${f.fix || ''}`),
  ]

  if (work.length === 0) break

  log(`Fix round ${fixRounds}/${MAX_FIX_ROUNDS} — ${work.length} item(s)`)

  const fixed = await agent(
    `${CONSTITUTION}

${RECON_CONTEXT}

These gates failed after building "${TASK}". Fix ALL of them at the source — do not
suppress, do not weaken a test, do not add eslint-disable, and do not cast with 'any' to
silence a type error. If a finding is wrong or unfixable, say so in "unfixed" with the
reason rather than faking a fix.

${work.map((w, n) => `${n + 1}. ${w}`).join('\n')}`,
    {
      label: `fix:round-${fixRounds}`,
      phase: 'Fix',
      schema: {
        type: 'object',
        properties: {
          fixedCount: { type: 'number' },
          unfixed: { type: 'array', items: { type: 'string' } },
          notes: { type: 'string' },
        },
      },
    },
  )
  fixLog.push({ round: fixRounds, ...(fixed || { failed: true }) })

  // Re-measure, and re-open the review so fixes get judged too.
  phase('Verify')
  verify = await agent(verifyPrompt, {
    label: `verify:round-${fixRounds}`,
    phase: 'Verify',
    schema: VERIFY_SCHEMA,
  })
  review = null
}

const green = Boolean(verify && verify.passed) && (SKIP_REVIEW || !review || (review.findings || []).every(f => f.severity !== 'blocker'))

return {
  task: TASK,
  shipped: green && blocked.length === 0,
  recon: recon.summary,
  reconConflicts: recon.conflicts || [],
  plan: {
    scope: plan.scopeSummary,
    outOfScope: plan.outOfScope || [],
    units: plan.units.map(u => u.id),
    risks: plan.risks || [],
    needsAdr: Boolean(plan.needsAdr),
  },
  built: built.map(b => ({
    id: b.id,
    layer: b.layer,
    files: b.filesWritten || [],
    blocked: Boolean(b.blocked || b.failed),
    reason: b.blockedReason,
  })),
  blockedUnits: blocked.map(b => `${b.id}: ${b.blockedReason || 'agent failed'}`),
  verify: verify || { passed: false, failures: [{ gate: 'verify', detail: 'verify agent failed' }] },
  review: review ? { verdict: review.verdict, findings: review.findings } : SKIP_REVIEW ? 'skipped' : 'not reached',
  fixRounds,
  fixLog,
  // An honest exit: say plainly when the loop ran out of rounds still red.
  outcome: green
    ? blocked.length
      ? 'Gates green, but some units were blocked — see blockedUnits.'
      : 'All gates green.'
    : `Exited after ${fixRounds} fix round(s) still failing — see verify.failures and review.findings. NOT ready to merge.`,
}
