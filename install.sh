#!/usr/bin/env bash
set -euo pipefail

SKILL_NAME="ai-audit"
REPO_URL="https://github.com/ArtemTscherwinski/ai-audit"

# Map CLI keys to display names and skill directories
# Only Claude Code and Qoder support installable skills (SKILL.md format).
# Other CLIs get a best-effort install path for reference.
declare -A CLI_NAMES
CLI_NAMES["1"]="Claude Code"
CLI_NAMES["2"]="Qoder"
CLI_NAMES["3"]="Cursor"
CLI_NAMES["4"]="Windsurf"
CLI_NAMES["5"]="GitHub Copilot"
CLI_NAMES["6"]="Gemini CLI"
CLI_NAMES["7"]="Codex (OpenAI)"

declare -A CLI_DIRS
CLI_DIRS["1"]="$HOME/.claude/skills"
CLI_DIRS["2"]="$HOME/.qoder/skills"
CLI_DIRS["3"]="$HOME/.cursor/skills"
CLI_DIRS["4"]="$HOME/.windsurf/skills"
CLI_DIRS["5"]="$HOME/.copilot/skills"
CLI_DIRS["6"]="$HOME/.gemini/skills"
CLI_DIRS["7"]="$HOME/.codex/skills"

echo "============================================"
echo "  AI Audit — Installer"
echo "============================================"
echo ""

# Ask which CLI the user uses
echo "Which AI CLI are you using?"
echo ""
echo "  1) Claude Code       (default)"
echo "  2) Qoder"
echo "  3) Cursor"
echo "  4) Windsurf"
echo "  5) GitHub Copilot"
echo "  6) Gemini CLI"
echo "  7) Codex (OpenAI)"
echo ""

if [ -t 0 ]; then
  read -p "Enter number [1-7] (default: 1): " CHOICE
else
  # Non-interactive (piped curl): default to Claude Code
  CHOICE="1"
fi
CHOICE="${CHOICE:-1}"

CLI_NAME="${CLI_NAMES[$CHOICE]:-Claude Code}"
SKILL_DIR="${CLI_DIRS[$CHOICE]:-$HOME/.claude/skills}/$SKILL_NAME"

echo ""
echo "→ Installing for: $CLI_NAME"
echo "→ Destination:    $SKILL_DIR"
echo ""

if ! command -v node &> /dev/null; then
  echo "Error: Node.js is required but not installed."
  echo "Install it from https://nodejs.org/ (LTS version recommended)"
  exit 1
fi

mkdir -p "$(dirname "$SKILL_DIR")"

if [ -d "$SKILL_DIR" ]; then
  echo "Removing existing installation..."
  rm -rf "$SKILL_DIR"
fi

echo "Cloning $REPO_URL..."
git clone --depth 1 "$REPO_URL" "$SKILL_DIR" 2>/dev/null || {
  echo "Error: Failed to clone repository."
  exit 1
}

rm -rf "$SKILL_DIR/.git"

echo "Installing dependencies..."
cd "$SKILL_DIR"
npm install --production --silent

echo ""
echo "============================================"
echo "  Done!"
echo "============================================"
echo ""
echo "  Skill:   $SKILL_NAME"
echo "  CLI:     $CLI_NAME"
echo "  Path:    $SKILL_DIR"
echo ""
echo "  Run /ai-audit in any repo to check"
echo "  its AI-friendliness."
echo ""
