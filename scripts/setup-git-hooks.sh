#!/usr/bin/env sh

set -eu

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

chmod +x .githooks/pre-commit
git config --local core.hooksPath .githooks

printf 'Git hooks enabled for %s\n' "$repo_root"
