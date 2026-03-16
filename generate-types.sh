#!/bin/sh
set -e

tmp_openapi=$(mktemp)
tmp_openapi_for_dto=$(mktemp)
trap 'rm -f "$tmp_openapi" "$tmp_openapi_for_dto"' EXIT

jq -M --slurpfile locale lang/en_MAIN.json '
  .components.schemas._translation_key.enum = (
    $locale[0]
    | to_entries
    | map(select(.value | type=="string" or type=="array") | .key)
    | sort
  )
' src/api/rainwave-openapi.json > "$tmp_openapi" && mv "$tmp_openapi" src/api/rainwave-openapi.json

# The Pydantic DTO generator breaks linting rules that are difficult to override
# with pyright's options, as it's not as flexible as e.g. ESLint.
# Remove the translation key enum from Pydantic use stops these errors, so
# this is a temporary file that generates an OpenAPI spec without it so that
# Pydantic doesn't get it.  Yes, this is the cleanest way!
jq -M '
  .components.schemas._translation_key = {
    "type": "string",
    "description": "Translation key used for localization lookups."
  }
' src/api/rainwave-openapi.json > "$tmp_openapi_for_dto"

npx prettier --write ./src/api/rainwave-openapi.json

uv run datamodel-codegen --input "$tmp_openapi_for_dto" --input-file-type openapi --output src/api/rainwave_dto.py --output-model-type pydantic_v2.BaseModel --target-python-version 3.14 --openapi-scopes paths --formatters black --remove-special-field-name-prefix
uv run datamodel-codegen --input src/api/rainwave-openapi.json --input-file-type openapi --output src/api/rainwave_typeddicts.py --output-model-type typing.TypedDict --target-python-version 3.14 --formatters black --remove-special-field-name-prefix
uv run ./src/tools/rw_templates.py --templatedir ./frontend/src/components --outfile ./frontend/src/templates/index
npx openapi-typescript ./src/api/rainwave-openapi.json -o ./frontend/src/rainwaveApi/rainwave-openapi.d.ts

echo "Done."
