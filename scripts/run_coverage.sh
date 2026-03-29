#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

export UV_CACHE_DIR="${UV_CACHE_DIR:-/tmp/uv-cache}"

rm -f .coverage .coverage.*

uv run coverage run -m pytest "$@"
uv run coverage combine
uv run coverage report -m
uv run coverage html

echo
echo "HTML coverage written to htmlcov/index.html"
