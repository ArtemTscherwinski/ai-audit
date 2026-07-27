#!/usr/bin/env bash
set -euo pipefail

SKILL_NAME="ai-audit"
SKILL_DIR="$HOME/.qoder/skills/$SKILL_NAME"
REPO_URL="https://github.com/ArtemTscherwinski/ai-audit"

echo "Installing $SKILL_NAME..."

if ! command -v node &> /dev/null; then
  echo "Error: Node.js is required but not installed."
  exit 1
fi

mkdir -p "$HOME/.qoder/skills"

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
echo "Done! $SKILL_NAME is installed at $SKILL_DIR"
echo "Run /ai-audit in any repo to check its AI-friendliness."
