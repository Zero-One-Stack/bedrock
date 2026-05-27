# Policy-as-code (OPA / Conftest) for package.json — dependency governance as a CI gate.
# Run:  conftest test package.json --policy policy/  --data policy/waivers.yaml
# This turns governance.md's "no unvetted/banned deps" from prose into a build-breaking check,
# with EXPLICIT, EXPIRING waivers (the only sanctioned way to deviate). See rules/governance.md.
package main

import rego.v1

# --- Inputs -----------------------------------------------------------------
# `input`        = parsed package.json
# `data.waivers` = waivers.yaml: { banned_dep_waivers: [{dep, reason, approver, expires}], ... }

deps := object.union(object.get(input, "dependencies", {}), object.get(input, "devDependencies", {}))

# --- Banned by the constitution (hard bans from CLAUDE.md) ------------------
banned := {
  "@chakra-ui/react": "styling-owning lib — use CSS Modules + tokens (styling-and-tokens.md)",
  "styled-components": "runtime CSS-in-JS — banned (styling-and-tokens.md)",
  "@emotion/styled": "runtime CSS-in-JS — banned (styling-and-tokens.md)",
  "effector": "external server-state store — use React Query (services-and-data.md)",
  "redux": "server-state store — use React Query (services-and-data.md)",
}

# A waiver is valid only if it names this dep AND has not expired.
waived(dep) if {
  some w in object.get(data.waivers, "banned_dep_waivers", [])
  w.dep == dep
  time.parse_rfc3339_ns(sprintf("%sT00:00:00Z", [w.expires])) > time.now_ns()
}

deny contains msg if {
  some dep, _ in deps
  reason := banned[dep]
  not waived(dep)
  msg := sprintf("BANNED dependency '%s': %s. Remove it, or add an expiring waiver to policy/waivers.yaml (see governance.md).", [dep, reason])
}

# Warn when a waiver exists but is close to / past expiry handled by the expired-waiver rule below.
warn contains msg if {
  some w in object.get(data.waivers, "banned_dep_waivers", [])
  time.parse_rfc3339_ns(sprintf("%sT00:00:00Z", [w.expires])) <= time.now_ns()
  msg := sprintf("EXPIRED waiver for '%s' (expired %s) — remove the dep or renew the waiver with a new approval.", [w.dep, w.expires])
}

# --- Pinned-version guard (CLAUDE.md: "never pin") --------------------------
# Flag exact-pinned versions (no ^ or ~ or range) unless waived. Conservative: only flags
# a bare semver like "1.2.3"; ranges, "latest", workspace:* etc. are fine.
deny contains msg if {
  some dep, ver in deps
  regex.match(`^\d+\.\d+\.\d+$`, ver)
  not version_pin_waived(dep)
  msg := sprintf("PINNED version '%s@%s' — kit policy is 'always latest, never pin'. Use a range, or waive with a reason (governance.md).", [dep, ver])
}

version_pin_waived(dep) if {
  some w in object.get(data.waivers, "pin_waivers", [])
  w.dep == dep
}
