#!/bin/sh

git ls-files -z "**/*.py" | xargs -0 pylint
if [ "$?" -ne "0" ]; then exit 1; fi
git ls-files -z "**/*.py" | xargs -0 black --check
if [ "$?" -ne "0" ]; then exit 1; fi
echo "No Python linting errors found"
