#!/usr/bin/env bash
# Convenience wrapper. See tools/sync-shared.mjs for the real work.
set -euo pipefail
cd "$(dirname "$0")/.."
exec node tools/sync-shared.mjs "$@"
