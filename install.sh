#!/usr/bin/env bash
set -euo pipefail

SKILL_NAME="ai-audit"
REPO_URL="https://github.com/ArtemTscherwinski/ai-audit"

# Resolve CLI choice to display name and skill directory
resolve_cli() {
  case "${1:-1}" in
    1|"") CLI_NAME="Claude Code";       SKILL_DIR="$HOME/.claude/skills"   ;;
    2)    CLI_NAME="Qoder";             SKILL_DIR="$HOME/.qoder/skills"    ;;
    3)    CLI_NAME="Cursor";            SKILL_DIR="$HOME/.cursor/skills"   ;;
    4)    CLI_NAME="Windsurf";          SKILL_DIR="$HOME/.windsurf/skills" ;;
    5)    CLI_NAME="GitHub Copilot";    SKILL_DIR="$HOME/.copilot/skills"  ;;
    6)    CLI_NAME="Gemini CLI";        SKILL_DIR="$HOME/.gemini/skills"   ;;
    7)    CLI_NAME="Codex (OpenAI)";    SKILL_DIR="$HOME/.codex/skills"    ;;
    *)    CLI_NAME="Claude Code";       SKILL_DIR="$HOME/.claude/skills"   ;;
  esac
}

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
  # Direct terminal invocation: read from stdin (which IS the terminal)
  read -p "Enter number [1-7] (default: 1): " CHOICE
else
  # Pipe mode: try piped stdin first (scripting/testing).
  # If empty (curl|bash where bash consumed the pipe), fall back to /dev/tty
  # so the user can still respond on their terminal.
  read -r CHOICE 2>/dev/null || true
  if [ -z "${CHOICE:-}" ]; then
    echo -n "Enter number [1-7] (default: 1): "
    read -r CHOICE < /dev/tty 2>/dev/null || CHOICE="1"
  fi
fi

resolve_cli "$CHOICE"
SKILL_DIR="$SKILL_DIR/$SKILL_NAME"

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
