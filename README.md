# ai-audit

**Can AI agents actually work in your repo?** Find out in 30 seconds.

`ai-audit` is a [Qoder](https://qoder.com) skill that scores any codebase across 7 dimensions of AI-agent friendliness — then offers to fix what's broken. Works with Claude Code, Cursor, Windsurf, Copilot, Gemini CLI, and more.

```
┌─────────────────────────┬───────────┐
│ Category                │ Level     │
├─────────────────────────┼───────────┤
│ Agent Instructions      │ Adequate  │
│ Documentation Coverage  │ Minimal   │
│ Nested Context          │ Good      │
│ Code Navigability       │ Adequate  │
│ Token Efficiency        │ Minimal   │
│ Tooling & Automation    │ Good      │
│ Guardrails              │ Missing   │
├─────────────────────────┼───────────┤
│ OVERALL                 │ Missing   │
└─────────────────────────┴───────────┘

Verdict: Claude Code can work here but will frequently misunderstand
conventions and waste tokens on oversized files.

Fix this first: Add pre-commit hooks and "do not touch" zones
to prevent agents from modifying generated files.
```

## Why?

AI coding agents are only as good as the context they can load. A repo with no `CLAUDE.md`, 2000-line god files, and no type annotations forces agents to guess, hallucinate, and burn tokens reading implementations instead of signatures.

**You don't need to be an expert in the stack.** Drop into any unfamiliar repo, run `/ai-audit`, and instantly know whether AI will be effective here — or what to fix first.

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/ArtemTscherwinski/ai-audit/main/install.sh | bash
```

Requires: Node.js 18+, [Qoder CLI](https://qoder.com)

## Usage

```bash
cd any-repo
qodercli
> /ai-audit
```

The skill asks which CLI you're targeting (defaults to **Claude Code**). Say "all" to audit for every supported CLI at once.

That's it. The skill runs structural checks (fast, deterministic), then applies LLM judgment where quality matters, and produces a scorecard with actionable fixes.

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

The Agent Instructions and Guardrails categories check CLI-specific files. If you audit for Cursor, it looks for `.cursorrules` — not `CLAUDE.md`.

## The 7 Categories

| # | Category | What it measures |
|---|----------|-----------------|
| 1 | **Agent Instructions** | Are there explicit instructions for AI agents? (`CLAUDE.md`, `AGENTS.md`, nested context files) |
| 2 | **Documentation Coverage** | Do docs cover architecture, conventions, domain? Are they current and linked? |
| 3 | **Nested Context** | Do complex sub-packages have their own agent instructions? |
| 4 | **Code Navigability** | Can an agent *find* the right file quickly? (naming, boundaries, indexes) |
| 5 | **Token Efficiency** | Does reading code cost too much? (god files, missing types, boilerplate, no compression tools) |
| 6 | **Tooling & Automation** | Can an agent *verify* its work? (tests, lint, typecheck, CI, one-command bootstrap) |
| 7 | **Guardrails** | Are agents constrained safely? (hooks, "do not" zones, permission configs) |

## Maturity Levels

| Level | Meaning |
|-------|---------|
| **Missing** | Nothing exists. Agent is blind. |
| **Minimal** | Something exists but is thin. Agent will guess often. |
| **Adequate** | Agent can work with occasional misunderstandings. |
| **Good** | Agent works well. Minor friction only. |
| **Excellent** | Actively optimized. Minimal token waste, maximum clarity. |

## Supported Stacks

- TypeScript / JavaScript
- Python
- Go
- Rust
- Swift / SwiftUI

Polyglot repos are auto-detected — all relevant checks apply per directory.

## How It Works

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Structural  │────▶│ LLM Judgment │────▶│ Remediation  │
│  Checks      │     │ (quality)    │     │ (fixes)      │
│  (script)    │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
   fast, free          reads docs,          scaffold, enrich,
   deterministic       samples code         describe refactors
```

1. **Structural phase** — A TypeScript script checks file existence, line counts, config parsing, glob patterns. Outputs JSON. Zero LLM tokens.
2. **Judgment phase** — The agent reads docs, samples code, cross-references docs against reality. Assigns maturity levels where quality matters.
3. **Remediation** — Prioritized fixes. Missing categories first. Creates/enriches docs, describes (but doesn't execute) code refactors. You can bail at any point.

## Token Efficiency Signals

The audit flags anything that forces agents to consume more tokens than necessary:

- Files over 500 lines (god files)
- Missing type annotations (forces reading implementations)
- Deep inheritance chains (4+ levels)
- Circular dependencies
- Scattered configuration
- Repetitive boilerplate
- Lock files / snapshots tracked without ignore directives
- No context scoping in CLAUDE.md

## Recommended Skills

The audit checks whether you have these high-value productivity skills installed:

| Skill | What it does |
|-------|-------------|
| [Graphify](https://github.com/Graphify-Labs/graphify) | Turns codebases into queryable knowledge graphs — agents understand structure without reading every file |
| [Caveman](https://github.com/JuliusBrussee/caveman) | Cuts ~65% of output tokens by compressing agent communication |
| [Ponytail](https://github.com/DietrichGebert/ponytail) | Makes agents think like the laziest senior dev — avoids over-engineering |
| [Matt Pocock Skills](https://github.com/mattpocock/skills) | Engineering workflow skills (grilling, TDD, code review, debugging) |

Missing recommended skills cap your Token Efficiency level at **Good** — you can't reach Excellent without them.

## After the Audit

The skill offers to fix issues in priority order:

- **Scaffold** missing files (`CLAUDE.md`, `AGENTS.md`, nested context)
- **Enrich** existing docs (add missing sections)
- **Describe** code refactors (split that 2400-line file) — without executing them

Optionally saves the report to `docs/ai-audit-report.md` for sharing with your team.

## Requirements

- [Qoder CLI](https://qoder.com) installed
- Node.js 18+ (for the structural check script)
- Works on macOS, Linux

## License

MIT
