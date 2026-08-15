#!/bin/bash
# Double-click this file in Finder to boot Pi Remote for phone testing.
# It starts the tailnet-only deployment and prints a scannable enrollment QR
# in this window. Keep the window open while you test. Stop with Control-C.
#
# Tool locations are set explicitly so a double-click works regardless of which
# shell profile Finder loads (Homebrew tools plus the pi binary in ~/.local/bin).

export PATH="/opt/homebrew/bin:$HOME/.local/bin:$PATH"
cd "$(dirname "$0")" || exit 1
exec npm run boot
