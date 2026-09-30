#!/bin/sh
set -e

uv run ./src/template_compiler/rw_templates.py --templatedir ./frontend/src/components --outfile ./frontend/src/templates/index
cd frontend
npm run lint:fix
cd ..
