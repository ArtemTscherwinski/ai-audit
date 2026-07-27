# ai-audit

**One command tells you why your AI coding assistant keeps getting things wrong — and fixes it.**

## The problem

Imagine hiring a brilliant contractor but giving them no blueprint, no house rules, and locking half the rooms. They'd guess at the wiring, knock down the wrong wall, and blame *you* for not being clear.

That's what happens when an AI coding tool works in an unprepared project. It's not the AI's fault. It's the setup.

## Who is this for?

You, if you use AI coding tools but aren't a software engineer by training:

- Data scientists working in backend repos
- Researchers touching production code
- Product managers fixing small things
- Junior devs dropped into an unfamiliar codebase

You don't need to know what "correct" looks like. That's what this tool tells you.

## What you'll get

```
┌──────────────────────────────────────────────────────────────────┬───────────┐
│ Category                                                         │ Level     │
├──────────────────────────────────────────────────────────────────┼───────────┤
│ AI Instructions — Does the AI know the rules of this project?    │ Adequate  │
│ Documentation — Are there guides the AI can read?                │ Minimal   │
│ Sub-areas — Do complex parts have their own instructions?        │ Good      │
│ Findability — Can the AI find the right file quickly?            │ Adequate  │
│ Readability — Is the code easy for the AI to read?               │ Minimal   │
│ Verification — Can the AI check its own work?                    │ Good      │
│ Safety nets — Are there guards against the AI breaking things?   │ Missing   │
├──────────────────────────────────────────────────────────────────┼───────────┤
│ OVERALL                                                          │ Missing   │
└──────────────────────────────────────────────────────────────────┴───────────┘

Verdict: The AI can work here but will frequently misunderstand
conventions and waste effort reading oversized files.

Fix this first: Add safety rules so the AI can't accidentally
modify files it shouldn't touch.
```

## Install

Open your terminal (Terminal on Mac, PowerShell on Windows) and paste this:

```bash
curl -fsSL https://raw.githubusercontent.com/ArtemTscherwinski/ai-audit/main/install.sh | bash
```

Don't have Node.js? [Install it here first](https://nodejs.org/) (pick the LTS version).

This copies the skill into your Qoder skills folder. It doesn't modify your projects.

## Usage

```bash
cd your-project
qodercli
> /ai-audit
```

Here's what happens:

1. **It scans your project** — takes a few seconds, reads file names and sizes. Nothing is changed.
2. **It reads your docs and code** — judges quality where it matters. Still nothing is changed.
3. **It shows you a scorecard** — then offers to fix problems one by one. You say yes or no to each fix. Nothing happens without your permission.

## What it checks

| # | What it looks at | In plain terms |
|---|-----------------|----------------|
| 1 | AI Instructions | Is there a file that tells the AI "here's how we do things here"? |
| 2 | Documentation | Are there guides about the architecture, conventions, and domain? |
| 3 | Sub-areas | Do complex parts of the project have their own AI instructions? |
| 4 | Findability | Can the AI locate the right file without reading everything? |
| 5 | Readability | Is the code structured so the AI understands it without wasting effort? |
| 6 | Verification | Can the AI run tests to confirm its changes actually work? |
| 7 | Safety nets | Are there rules preventing the AI from touching things it shouldn't? |

## Scoring

| Level | What it means for you |
|-------|----------------------|
| **Missing** | The AI is flying blind. Expect wrong guesses and broken things. |
| **Minimal** | The AI has something to work with, but will still get things wrong often. |
| **Adequate** | The AI works, with occasional misunderstandings you'll need to catch. |
| **Good** | The AI works well. You'll rarely need to correct it. |
| **Excellent** | The AI is fully set up for success. Minimal wasted effort, maximum accuracy. |

## Works with

**AI tools:** Claude Code (default), Qoder, Cursor, Windsurf, GitHub Copilot, Gemini CLI, Codex

**Languages:** TypeScript, Python, Go, Rust, Swift

It automatically detects your project's language and AI tool, then checks for the right files.

## After the audit

The skill offers fixes in priority order — worst problems first:

- Creates missing instruction files for the AI
- Adds missing sections to existing docs
- Describes code problems it found (but won't change your code unless you ask)

You can stop at any point. You can also save the report to share with your team.

## Requirements

- [Qoder CLI](https://qoder.com)
- [Node.js 18+](https://nodejs.org/)
- macOS or Linux

## License

MIT
