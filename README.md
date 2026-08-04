# modelMesh

A decentralized AI model routing layer that connects multiple providers into one unified API.

## Development setup

The backend requires Rust 1.94 or newer.

Install the frontend dependencies and enable the repository-managed Git hooks:

```sh
pnpm --dir frontend install
./scripts/setup-git-hooks.sh
```

Start the Rust API:

```sh
cp backend/.env.example backend/.env
cargo run --manifest-path backend/Cargo.toml
```

Create the PostgreSQL database and start the Redis instance referenced by `backend/.env` before
starting the API. Database migrations run automatically during backend startup. The backend uses
shared PostgreSQL and Redis connection pools and verifies both dependencies before accepting
requests.

`MODELMESH_ENVIRONMENT=development` and `test` write structured logs only to the console.
`MODELMESH_ENVIRONMENT=production` writes them asynchronously to one local-date file per day under
`backend/logs/YYYYMMDD.log` by default. Change the level filter with `MODELMESH_LOG_FILTER` and the
directory with `MODELMESH_LOG_DIRECTORY`. Request logs never include HTTP headers, passwords, or
access tokens.

Then start the frontend in another terminal:

```sh
pnpm --dir frontend dev
```

The frontend keeps API requests under `/api`; the Vite development server proxies them to the
Axum server at `http://127.0.0.1:3000`. `GET /api/health` is the process liveness endpoint.
`GET /api/health/ready` verifies that both PostgreSQL and Redis are reachable.

Account authentication uses Argon2 password hashes and Redis-backed access tokens. Registration
creates the account and returns the user to the login page; a successful login issues an opaque
access token. The frontend stores it under the `modelmesh-access-token` local storage key and sends
it as `Authorization: Bearer <token>`. Redis stores only its SHA-256 hash with a default one-day
TTL. The available endpoints are:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

API errors keep the HTTP status code separate from a stable numeric business code:

```json
{
  "error": {
    "code": 11004
  }
}
```

The initial error-code ranges are:

| Range         | Purpose                       |
| ------------- | ----------------------------- |
| `10000-10999` | Common request errors         |
| `11000-11999` | Authentication errors         |
| `90000-99998` | Infrastructure errors         |
| `99999`       | Unknown internal server error |

The frontend maps these numeric codes to localized messages. Backend responses must not expose
internal error text or use fixed Chinese or English messages as the public error contract.

Before each commit, the hook:

- formats staged React, TypeScript, JavaScript, CSS, JSON, HTML, Markdown, and YAML files with Prettier;
- formats staged Rust files with rustfmt;
- rejects whitespace errors;
- runs the frontend formatting check, Oxlint, TypeScript build, and Vite build when frontend files change;
- runs rustfmt, Clippy with warnings denied, and Rust tests when backend files change.

If a formattable file contains both staged and unstaged changes, the hook stops instead of
overwriting the unstaged work. Stage the complete file or temporarily stash the unstaged changes
before committing.

## shadcn/ui with UnoCSS

The frontend follows the shadcn/ui source-component structure while keeping UnoCSS as its only
utility CSS engine. The required aliases, semantic theme tokens, `components.json`, and `cn()`
helper are already configured.

Add a component from the `frontend` directory:

```sh
pnpm ui:add button
```

Do not run `shadcn init`: the upstream initializer installs Tailwind CSS. Review newly generated
components for Tailwind-only animation utilities and adapt those utilities in `uno.config.ts`.

## Internationalization

The frontend supports Simplified Chinese (`zh-CN`) and English (`en`) through i18next and
react-i18next. It uses the saved `modelmesh-language` preference when available, otherwise it
follows the browser language.

Translation resources live in:

```text
frontend/src/i18n/locales/
```

User-facing copy, placeholders, accessibility labels, status text, and page metadata should use
translation keys rather than hard-coded text in React components. A future settings page can call
the shared `changeLanguage()` helper to switch languages.
