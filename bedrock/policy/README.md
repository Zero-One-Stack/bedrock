# Policy-as-Code — dependency governance with expiring waivers

This is the machine-enforced form of `rules/governance.md`'s waiver model: standards as **OPA/
Conftest** policy, deviations as **explicit, expiring waivers** with an audit trail (Conftest/OPA
decision output). It closes the "new/unapproved dependency" gate the CI workflow references.

## Files

| File | Purpose |
| --- | --- |
| `package-policy.rego` | Rules over `package.json`: deny constitution-banned deps (Chakra/Effector/CSS-in-JS/Redux), deny exact-pinned versions, flag expired waivers. |
| `waivers.yaml` | The only sanctioned deviation: dated, approved, **expiring** entries. Empty in the template. |

## Run it

```bash
# Install once:  brew install conftest   (or: go install github.com/open-policy-agent/conftest@latest)
conftest test package.json --policy policy/ --data policy/waivers.yaml
```

`deny` results fail the build; `warn` (e.g. an expired waiver) surfaces but you decide severity in
CI. Wire this as a step in `ci/github-actions-enterprise.yml` (the `supply-chain` job already has a
placeholder for it).

## How a waiver works (governance.md, made real)

1. A genuine need to keep a banned/pinned dep arises (e.g. a migration in flight).
2. Add an entry to `waivers.yaml`: `dep`, `reason`, `approver`, `expires` (YYYY-MM-DD), `adr`.
3. Write the **ADR** (`/adr`) — the durable "why" — and a row in `rules/project-specifics.md` →
   *Approved overrides* pointing to it.
4. CI passes until `expires`; **after expiry the gate fails**, forcing a renew-or-remove decision.
   Debt can't go permanent by neglect — the expiry is the forcing function.

## Why OPA/Conftest

One policy layer governs any JSON/YAML/HCL across many repos uniformly, and emits decision output
you can retain as audit evidence (SOC 2 change-management, `rules/compliance.md`). It generalizes:
the same approach can gate `tsconfig`, settings, or IaC later.

## Sources
- [OPA in CI/CD — decision logs](https://www.openpolicyagent.org/docs/cicd)
- [Conftest](https://www.conftest.dev/)
- [Policy as Code — Wiz](https://www.wiz.io/academy/application-security/policy-as-code)
