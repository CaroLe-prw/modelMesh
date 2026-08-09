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
starting the API. SeaORM migrations run automatically during backend startup and record applied
versions in `seaql_migrations`. The backend uses shared PostgreSQL and Redis connection pools and
verifies both dependencies before accepting requests.

`MODELMESH_ENVIRONMENT=development` and `test` write structured logs only to the console.
Development additionally enables SeaORM database query logs at the `info` level.
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

Authentication responses include the account's highest `role`: `personal`, `merchant`, or
`admin`. New accounts default to `personal`; role assignment is not exposed through public
self-service APIs. Account-center route metadata and role visibility are stored in PostgreSQL.
The frontend loads the current account's visible routes from `GET /api/account-routes` instead of
inferring access from a hard-coded role hierarchy. Administrators can inspect and update the role
matrix through `GET /api/admin/account-routes` and
`PUT /api/admin/account-routes/{route_key}/roles`.
Visible route lists are cached in Redis under `modelmesh:account-routes:user:{user_id}` for one
day. Cache entries include the user's role, so a role change cannot reuse an old route list. A
route permission update deletes the cached lists for every user in the affected old and new roles.

Authenticated users can manage ModelMesh API keys through:

- `GET /api/api-keys?page=1&pageSize=20&query=codex`
- `POST /api/api-keys`
- `PUT /api/api-keys/{api_key_id}`
- `PUT /api/api-keys/{api_key_id}/status`
- `DELETE /api/api-keys/{api_key_id}`

The create endpoint returns the plaintext API key once. System-generated keys use the `sk-`
prefix. PostgreSQL stores only its SHA-256 hash, masked display fragments, access controls,
spending limits, status, optional expiration, and the latest successful usage time and source IP.
API key names are unique within an account, and every read or mutation is scoped to the
authenticated user.
The list endpoint defaults to page 1 with 20 items per page and accepts up to 100 items per page.
All paginated endpoints use the same response envelope: `items` contains the current page and
`pagination` contains `page`, `pageSize`, `total`, and `totalPages`.
The optional `query` parameter searches API key names, masked key identifiers, prefixes, suffixes,
and performs an exact hash lookup when a complete API key is supplied.

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
| `12000-12999` | API key management errors     |
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
