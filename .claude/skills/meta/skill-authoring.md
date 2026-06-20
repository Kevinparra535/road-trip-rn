---
name: skill-authoring
description: Author, format, and maintain the skills in this stack so they stay consistent and portable across projects. Use when writing a new skill, reformatting an existing one, or installing these skills into a project's agent-instruction folder.
---

<purpose>
Every skill in this repo is an executable instruction document consumed by humans and LLMs
(Claude Code, Cursor, Copilot). This skill defines the **canonical format** and the
**persistence convention** so skills read the same, trigger reliably, and survive being copied
into real projects without drifting. It is the source of truth other skills follow.
</purpose>

<when_to_use>
- Writing a new skill for this stack.
- Reformatting an existing skill to the canonical format.
- Reviewing a skill in a PR for format/quality.
- Installing or updating these skills inside a consuming project.
</when_to_use>

<canonical_format>
A skill is a single Markdown file with YAML frontmatter and XML-tagged body sections. Use XML
tags as boundary markers for the major semantic blocks; use Markdown (headings, tables, code
fences) freely *inside* them. Do not nest XML deeper than needed — prefer flat, readable
structure over clever hierarchy.

### Frontmatter (required)

```yaml
---
name: <kebab-case-id>            # matches the folder/file name; stable, never reworded casually
description: <one sentence>      # third person; states WHAT it does AND WHEN to use it
---
```

The `description` is the trigger. Treat it like a tool description: unambiguous, specific, and
written so an agent can decide *from this line alone* whether the skill applies. Start with a
verb, name the concrete artifacts/tech, and end with "Use when …".

### Body sections (in this order)

| Tag                 | Required | Holds                                                              |
| ------------------- | -------- | ----------------------------------------------------------------- |
| `<purpose>`         | yes      | 1 short paragraph: what this skill enforces and why it matters.   |
| `<when_to_use>`     | yes      | Bullet list of concrete triggers.                                 |
| `<rules>`           | yes      | The mandatory rules, grouped with `###` headings; include the *why* where non-obvious. |
| `<examples>`        | when useful | Canonical code/patterns, each in a nested `<example>` tag.      |
| `<output_format>`   | when the skill produces output | What the agent should return/produce.          |
| `<see_also>`        | when relevant | Cross-links to related skills via `[[skill-name]]`.            |

Checklists (like the PR checklist) may use `<checklist>` instead of `<rules>`.
</canonical_format>

<writing_principles>
Distilled from Anthropic's prompt-engineering, context-engineering, and tool-writing guidance,
plus XML-tagging practice. Apply all of them.

### Right altitude (not too rigid, not too vague)
Write strong heuristics, not brittle hardcoded procedures and not hand-wavy goals. Aim for
"specific enough to guide behavior, flexible enough to let the model reason." If a rule encodes
a one-off edge case, it probably belongs in an example, not a rule.

### Minimal high-signal tokens
Find the smallest set of tokens that reliably produce the desired behavior. Context is a finite
attention budget — cut redundancy, merge overlapping rules, delete anything that doesn't change
what the agent does. A shorter skill that still covers the behavior beats a longer one.

### Say what TO do, not what NOT to do
Prefer "Logging uses the scoped `Logger`" over "Never use console.log". State the positive rule;
add a counter-example only when the wrong pattern is genuinely tempting.

### Give the why
A one-clause rationale ("…so streams can be torn down") makes the rule generalize. The model
applies it correctly to cases you didn't enumerate.

### Examples are pictures worth a thousand words
Include 1–5 curated, canonical examples. Make them relevant and diverse (cover the real shape,
not a laundry list of edge cases). Wrap each in `<example>`; show the *correct* pattern.

### Don't over-prompt
Do not shout. Avoid "CRITICAL / YOU MUST / ALWAYS" stacked everywhere — current models
over-trigger on aggressive language. Use plain, firm wording ("Use X", "X is mandatory"). Reserve
emphasis for the few truly non-negotiable invariants.

### Consistency
Once a tag set and naming scheme are chosen, use them identically across every skill. Consistent
structure is itself a signal the model reads.
</writing_principles>

<persistence_convention>
This repo's `skills/` tree is the **source of truth**. Projects consume copies; the convention
keeps those copies identifiable and current.

### Where skills live in a consuming project
Install each skill in the project's agent-instruction location, keeping the same `name`:

- **Claude Code:** `.claude/skills/<name>/SKILL.md` (one directory per skill; frontmatter
  `name` + `description` drive discovery).
- **Cursor:** `.cursor/rules/<name>.mdc`.
- **Generic / Copilot / other agents:** keep the file under `docs/skills/<name>.md` and link it
  from the project's `CLAUDE.md` / `AGENTS.md` so it is loaded as context.

Always preserve the `name` from the source so a skill is traceable back here.

### Keeping copies from drifting (anti-drift)
- The source skill in this repo changes **first**; project copies are re-synced from it, never
  edited in place and forgotten.
- A skill change that alters a rule bumps the [`CHANGELOG`](../../CHANGELOG.md) and, if it
  reverses a documented decision, gets/updates an ADR in `docs/02-decision-records/`.
- When a project's real patterns diverge from a skill, fix the source skill here (or record why
  the project intentionally deviates), then re-sync — don't let the copy silently rot.
- Review skills against the codebase when the architecture shifts (new layer, new library, new
  convention), not on a fixed calendar.
</persistence_convention>

<authoring_checklist>
Before committing a new or edited skill:

- [ ] Frontmatter `name` matches the file; `description` says what + when, trigger-ready
- [ ] Body uses the canonical `<purpose>`/`<when_to_use>`/`<rules>`/`<examples>`/`<output_format>`/`<see_also>` sections in order
- [ ] Rules are at the right altitude (heuristics, not brittle steps); each non-obvious rule states its why
- [ ] Phrasing is positive (what to do); no stacked CRITICAL/MUST shouting
- [ ] Redundancy removed; overlapping rules merged; every line changes agent behavior
- [ ] Examples are canonical and wrapped in `<example>` tags
- [ ] Cross-links use `[[skill-name]]`; no broken references
- [ ] CHANGELOG updated; ADR added/updated if a decision changed
</authoring_checklist>

<see_also>
- [[clean-architecture-rn-expo-mvvm]] — the general architecture rules this format wraps.
- [[pr-checklist-clean-architecture]] — review gate that enforces several of these conventions.
</see_also>
</content>
