# modelMesh

A decentralized AI model routing layer that connects multiple providers into one unified API.

## Development setup

Install the frontend dependencies and enable the repository-managed Git hooks:

```sh
pnpm --dir frontend install
./scripts/setup-git-hooks.sh
```

Before each commit, the hook:

- formats staged React, TypeScript, JavaScript, CSS, JSON, HTML, Markdown, and YAML files with Prettier;
- formats staged Rust files with rustfmt;
- rejects whitespace errors;
- runs the frontend formatting check, Oxlint, TypeScript build, and Vite build when frontend files change;
- runs rustfmt, Clippy with warnings denied, and Rust tests when backend files change.

If a formattable file contains both staged and unstaged changes, the hook stops instead of
overwriting the unstaged work. Stage the complete file or temporarily stash the unstaged changes
before committing.
