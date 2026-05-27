# Managed Settings — the locked org tier

`managed-settings.json` is the **highest-precedence** Claude Code settings layer. Deployed to the
OS path below, **users and projects inherit it and cannot weaken it** — this is how an org makes a
small set of controls non-negotiable while delegating everything else (the tiered-governance model
from the research: locked top tier + delegated lower tiers).

## Where it deploys (per OS)

| OS | Path |
| --- | --- |
| macOS | `/Library/Application Support/ClaudeCode/managed-settings.json` |
| Linux / WSL | `/etc/claude-code/managed-settings.json` |
| Windows | `C:\ProgramData\ClaudeCode\managed-settings.json` |

Deploy via your MDM (Jamf, Intune, etc.) or config-management (Ansible) so it lands on every
developer machine. For **Claude for Teams/Enterprise**, you can instead push *server-managed
settings* from the admin console — same effect, no MDM.

## What it locks (and what it deliberately doesn't)

**Locked (non-negotiable):**
- `permissions.deny` — dangerous commands + secret/credential file reads (treat the agent as an
  untrusted contributor; default-deny exfiltration paths).
- `permissions.ask` — pushes, publishes, and web fetches require confirmation.
- `disableBypassPermissionsMode` — devs can't bypass the permission system.
- `allowedMcpServers` / `deniedMcpServers` — only approved external integrations.

**Delegated (projects/users tune freely):** everything else — model, styling choices within the
constitution, project memory, per-project allow rules. The constitution (`CLAUDE.md` + rules) is
*advisory-enforced* by the model + hooks + CI; this file is the *hard* OS-level floor.

## Precedence (highest → lowest)

```
managed-settings.json (this, locked) ▸ CLI args ▸ .claude/settings.local.json ▸ .claude/settings.json ▸ ~/.claude/settings.json
```

`permissions` **merge** across layers (deny/allow/ask accumulate); a managed `deny` can't be undone
below. Most other keys override by precedence.

## Tune before deploying

This template is a safe starting point, not a finished policy. Review `deny`/`ask` against your
org's actual tools and risk posture, set `allowedMcpServers` to your approved list, and decide
whether `allowManagedPermissionRulesOnly` should be `true` (only managed permission rules apply —
strict) for regulated clients.

## Sources
- Settings precedence & managed-settings keys — Claude Code settings docs.
- Tiered policy model (locked vs. delegated) — GitHub Copilot enterprise policies.
