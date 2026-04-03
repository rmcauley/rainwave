#!/bin/sh
set -e

uv run ./src/template_compiler/rw_templates.py --templatedir ./frontend/src/components --outfile ./frontend/src/templates/index
cd frontend
npx prettier --write "**/*.template.ts"
npx eslint --fix "**/*.template.ts"
cd ..
