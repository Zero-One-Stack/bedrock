# Rule: Tech Radar (the org-level decision register)

> **Non-negotiable (enterprise overlay).** Cross-project technology choices live in a **Tech Radar**
> — an org-level register of what to **Adopt / Trial / Assess / Hold**. It sits *above* per-project
> ADRs: an ADR records why *this project* chose X; the radar records the org's stance on X across
> *all* projects. Agents consult it so every project starts from the same defaults.

## Why (memory at org scale)

ADRs are per-repo decision memory. But "do we use Zustand? is Tailwind still on Hold?" is an
*org* question — if each project re-decides it, the standard fragments. The radar is the durable,
shared answer, reviewed on a cadence by senior technologists, so projects don't re-litigate settled
org calls. It's blame-free alignment, and a feedback loop: a project that successfully *Trials*
something can promote it to *Adopt*.

## The four rings

| Ring | Meaning | Agent behavior |
| --- | --- | --- |
| **Adopt** | Proven; the default choice. | Use it; no ADR needed to justify the default. |
| **Trial** | Worth pursuing on real projects, with care. | Allowed; record the trial as an ADR. |
| **Assess** | Worth exploring; not for production yet. | Don't ship in client work without an explicit, ADR-backed decision. |
| **Hold** | Don't start new work with it (legacy/declined). | Treat as effectively banned for new code; existing use is migration debt. |

Quadrants: **Techniques · Tools · Platforms · Languages & Frameworks**.

## Where it lives & how it's maintained

- `docs/radar/radar.md` — the register (table per quadrant; see template below). One per org;
  in a consultancy, this is shared across client repos (or referenced from each).
- Reviewed **~quarterly** by senior technologists (not solo, not the C-suite). Movement between
  rings is the normal lifecycle (`Assess → Trial → Adopt`, or anything → `Hold`).
- The constitution's hard bans (Chakra, Effector) are **permanent `Hold`** entries — the radar and
  `CLAUDE.md` must agree; if they conflict, that's a bug to reconcile.

## How agents use it

- The architect (`/architect`) and `frontend-architect` consult the radar before proposing a
  library/framework — default to **Adopt**, justify anything in **Trial/Assess** with an ADR, refuse
  **Hold** for new code (offer the Adopt alternative).
- A project may deviate only via the usual logged waiver (ADR + `project-specifics.md`), same as any
  constitution rule.

## Hard rules

- ❌ Introducing a **Hold** technology into new code without a logged, ADR-backed waiver.
- ❌ Shipping an **Assess** technology in client production without an explicit decision.
- ❌ Per-project re-litigation of a settled org call — consult and follow the radar, or propose a
  radar change.
- ✅ Default to **Adopt**; radar reviewed on a cadence; radar and constitution kept consistent.

## Template — `docs/radar/radar.md`

```md
# Tech Radar — <org> — updated YYYY-MM-DD (next review: YYYY-MM-DD)

## Languages & Frameworks
| Tech | Ring | Since | Note / link to ADR |
| ---- | ---- | ----- | ------------------ |
| Next.js (App Router) | Adopt | 2026-Q1 | Default. |
| React Query | Adopt | 2026-Q1 | Server state (services-and-data.md). |
| Chakra UI | Hold | 2026-Q1 | Banned (styling-and-tokens.md); migrate off. |
| Effector | Hold | 2026-Q1 | Banned (services-and-data.md). |

## Tools
| … | | | |

## Platforms
| … | | | |

## Techniques
| … | | | |
```

## Sources
- [Build Your Own Technology Radar — Thoughtworks](https://www.thoughtworks.com/insights/blog/build-your-own-technology-radar)
- [Technology Radar FAQ — Thoughtworks](https://www.thoughtworks.com/en-us/radar/faq)
