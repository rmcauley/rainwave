#!/bin/sh
set -e

uv run ./src/template_compiler/rw_templates.py --templatedir ./frontend/src/components --outfile ./frontend/src/templates/index
cd frontend
npx @thelabnyc/typed-scss-modules --nameFormat none --exportType default src
npx prettier --write "**/*.scss.d.ts"
npx eslint --fix "**/*.scss.d.ts"
npx prettier --write "**/*.template.ts"
npx eslint --fix "**/*.template.ts"
cd ..
