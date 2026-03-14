#!/bin/sh

uv run datamodel-codegen --input src/api/rainwave-openapi.json --input-file-type openapi --output src/api/rainwave_dto.py --output-model-type pydantic_v2.BaseModel --target-python-version 3.14 --openapi-scopes paths --formatters black --remove-special-field-name-prefix
uv run datamodel-codegen --input src/api/rainwave-openapi.json --input-file-type openapi --output src/api/rainwave_typeddicts.py --output-model-type typing.TypedDict --target-python-version 3.14 --formatters black --remove-special-field-name-prefix
uv run ./src/tools/rw_templates.py --templatedir ./frontend/src/components --outfile ./frontend/src/templates/index
npx openapi-typescript ./src/api/rainwave-openapi.json -o ./frontend_sdk/rainwave-openapi.d.ts

echo "Done."
