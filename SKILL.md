---
name: ai-audit
description: Audit a repo for AI-agent friendliness. Use when the user wants to check if Qoder can work effectively in a repo, assess AI readiness, score a codebase's setup, or asks "is this repo AI-friendly?"
---

# AI Audit

Audit the current repo for AI-agent friendliness. Produce a maturity scorecard across 7 categories, then offer prioritized remediation.

## Audience

The user may be a non-expert dropping into an unfamiliar codebase. They want to know: "Can an AI agent work effectively here, or will it hallucinate and waste my time?" Use plain language for verdicts, technical detail underneath.

## Supported CLIs

| CLI | Instruction files | Config |
|-----|------------------|--------|
| **Claude Code** (default) | `CLAUDE.md`, `AGENTS.md`, nested `CLAUDE.md` | `.claude/settings.json` |
| **Qoder** | `CLAUDE.md`, `AGENTS.md`, nested `CLAUDE.md` | `.qoder/settings.json` |
| **Cursor** | `.cursorrules`, `.cursor/rules/*.md` | `.cursor/settings.json` |
| **Windsurf** | `.windsurfrules`, `.windsurf/rules/*.md` | — |
| **GitHub Copilot** | `.github/copilot-instructions.md` | — |
| **Gemini CLI** | `GEMINI.md` | — |
| **Codex (OpenAI)** | `AGENTS.md`, `codex.md` | — |

## Phase 0: CLI Selection

Ask the user which CLI they want to audit for. Default to **Claude Code** if they don't specify.

If the user says "all" or "multi", audit for all CLIs and report coverage per CLI in the Agent Instructions category.

Pass the selected CLI to the script via the `--cli` flag:

```bash
npx tsx <skill-dir>/scripts/audit.ts --cli claude-code
```

## Phase 1: Structural Audit

Run the structural check script:

```bash
npx tsx <skill-dir>/scripts/audit.ts --cli <selected-cli>
```

Where `<skill-dir>` is the directory containing this SKILL.md file. The script outputs JSON with:
- Detected tech stacks
- Monorepo boundaries
- Per-category structural findings with pre-computed maturity levels where deterministic
- CLI-specific instruction file detection

If the script fails (missing dependencies), run `npm install` in the skill directory first.

## Phase 2: Monorepo Check

If the JSON shows `monorepo.isMonorepo: true`, list the detected boundaries and ask the user which packages to audit. Only assess the selected packages for categories 3-7.

## Phase 3: LLM Judgment

For categories where `needsJudgment: true`, read the relevant files and assign a maturity level. Use these definitions:

### Maturity Levels

| Level | Meaning |
|-------|---------|
| **Missing** | Nothing exists. Agent is blind. |
| **Minimal** | Something exists but is thin. Agent will guess often. |
| **Adequate** | Agent can work effectively with occasional misunderstandings. |
| **Good** | Agent works well. Minor friction only. |
| **Excellent** | Actively optimized for agent productivity. Minimal token waste, maximum clarity. |

### Category Judgment Criteria

**1. Agent Instructions** — Does CLAUDE.md/AGENTS.md cover: architecture overview, conventions, common commands, "do not" zones? Is it specific or generic boilerplate?

**2. Documentation Coverage** — Do docs exist for architecture, API, conventions, domain? Does CLAUDE.md point to them? Cross-reference: do docs match the actual code, or are they stale?

**3. Nested Context** — (Structural, pre-computed.) Only judge if the script couldn't determine the level.

**4. Code Navigability** — Can an agent *find* the right file? Check: naming conventions, module boundaries, index/barrel files, directory structure clarity. Sample 3-5 source files.

**5. Token Efficiency** — Does reading/understanding code cost too much? Check: god files (2k+ lines), missing type information forcing implementation reads, deep inheritance chains, circular dependencies, scattered configuration, repetitive boilerplate. Also check if token-saving tools are leveraged (Caveman-style compression, graph representations, context scoping in CLAUDE.md).

**6. Tooling & Automation** — Can an agent verify its work? Check: test commands documented and runnable, linting configured, type checking active, CI present, one-command bootstrap from fresh clone possible.

**7. Guardrails** — Are agents constrained safely? Check: pre-commit hooks, instruction-level "do not" zones, tool permission configs (.claude/settings.json), CODEOWNERS.

## Phase 4: Report

Output format:

### Summary Table

```
┌─────────────────────────┬───────────┐
│ Category                │ Level     │
├─────────────────────────┼───────────┤
│ Agent Instructions      │ Adequate  │
│ Documentation Coverage  │ Minimal   │
│ ...                     │ ...       │
├─────────────────────────┼───────────┤
│ OVERALL                 │ Minimal   │
└─────────────────────────┴───────────┘
```

Overall = the lowest (weakest link) category level.

### One-Line Verdict

A plain-language sentence: e.g. "Qoder can work here but will frequently misunderstand conventions and waste tokens on oversized files."

### Fix This First

The single highest-impact recommendation — the Missing/Minimal category whose improvement would most raise the overall level.

### Detail Sections

For each category NOT at Excellent, provide:
- **Plain-language verdict** (1-2 sentences, no jargon)
- **Technical findings** (specific files, line counts, missing configs)
- **Suggested fix** (what to create/change)

## Phase 5: Remediation

Offer fixes in priority order (Missing categories first, then Minimal, then Adequate).

For each fix:
1. State what you'll do in one sentence
2. Ask for confirmation
3. Execute if confirmed

### What you CAN do:
- Scaffold missing files (CLAUDE.md, AGENTS.md, nested CLAUDE.md) with content tailored to what the audit found
- Add missing sections to existing docs ("Your CLAUDE.md has no 'do not touch' section — want me to add one?")
- Create .aiignore or add ignore directives

### What you DESCRIBE but don't execute:
- Code refactors ("This 2400-line file should be split into X, Y, Z")
- Architecture changes
- Test infrastructure setup

The user can say "stop" at any point to end remediation.

## Phase 6: Save (Optional)

After remediation, offer: "Want me to save this report to `docs/ai-audit-report.md`?"

Only write the file if the user confirms.

## Stack-Specific Checks

### TypeScript/JavaScript
- tsconfig strict mode
- Path aliases configured
- ESLint/Prettier configured
- Package.json scripts (test, lint, typecheck, build)

### Python
- mypy/pyright configured
- pyproject.toml with tool configs
- ruff/flake8/pylint present
- requirements.txt or poetry/pdm lockfile

### Go
- golangci-lint configured
- go.mod present and tidy
- Makefile/justfile with common commands
- Package structure (cmd/, internal/, pkg/)

### Rust
- clippy.toml present
- rustfmt.toml present
- Workspace structure for multi-crate
- cargo scripts documented

### Swift/SwiftUI
- SPM package structure (Package.swift boundaries)
- Doc comments (/// on public APIs)
- Strict concurrency settings (Swift 6 mode)
- Preview coverage for SwiftUI views
- View/model separation
- Code generation awareness (Sourcery, etc.)

## Token Efficiency Signals

Flag these as token-wasteful:
- Files over 500 lines (god files)
- Files over 2000 lines (critical)
- Missing type annotations (forces reading implementations)
- Deep inheritance chains (4+ levels)
- Circular dependencies between modules
- Configuration scattered across many files
- Repetitive boilerplate (40+ near-identical files)
- Lock files, snapshots, generated code tracked without ignore directives
- No context scoping in CLAUDE.md (agent must explore blindly)

## Recommended Skills Check

Check whether the user has these high-value skills installed in `~/.qoder/skills/`:

| Skill | Directory name | What it does | Install |
|-------|---------------|--------------|---------|
| Graphify | `graphify` | Turns codebases into queryable knowledge graphs — agents understand structure without reading every file | `github.com/Graphify-Labs/graphify` |
| Caveman | `caveman` | Cuts ~65% of output tokens by compressing agent communication | `github.com/JuliusBrussee/caveman` |
| Ponytail | `ponytail` | Makes agents think like the laziest senior dev — avoids over-engineering | `github.com/DietrichGebert/ponytail` |
| Matt Pocock Skills | any of: `grilling`, `tdd`, `code-review`, `diagnosing-bugs` | Engineering workflow skills (grilling, TDD, code review, debugging) | `github.com/mattpocock/skills` |

Check by listing `~/.qoder/skills/` and matching directory names. Report findings in the Token Efficiency detail section:

- Which recommended skills are installed
- Which are missing, with a one-line description of what the user gains by installing each
- Install command for each missing skill

Missing recommended skills cap the Token Efficiency level at **Good** (cannot reach Excellent without them). This check is informational — never auto-install skills without explicit user confirmation.
