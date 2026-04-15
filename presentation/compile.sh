#!/bin/bash
# ============================================================================
# Compile presentation.tex
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEX_FILE="presentation.tex"

cd "$SCRIPT_DIR"

if ! command -v pdflatex &>/dev/null; then
    echo "ERROR: pdflatex is not installed."
    echo "Please install MacTeX or BasicTeX on macOS."
    echo "  brew install --cask mactex-no-gui"
    exit 1
fi

echo "Compiling $TEX_FILE ..."
# Run pdflatex twice for proper reference resolution
pdflatex -interaction=nonstopmode "$TEX_FILE"
pdflatex -interaction=nonstopmode "$TEX_FILE"

echo ""
echo "Compilation complete! The presentation is available at: ${SCRIPT_DIR}/presentation.pdf"
