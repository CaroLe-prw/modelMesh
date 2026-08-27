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

On every startup, the backend immediately refreshes the public [models.dev](https://models.dev/)
catalog in a detached background task, then continues on the configured schedule. Catalog writes
use a dedicated single-connection PostgreSQL pool so a slow refresh cannot exhaust the API request
pool.
Successful cached data remains available if a later sync fails. Set
`MODELMESH_MODELS_DEV_SYNC_INTERVAL_HOURS` to control the periodic refresh interval; it defaults to
`24` hours. Transient connection, timeout, 429, and upstream 5xx failures are retried three times
by default with exponential delay. The source URL, connect/request timeouts, attempt count, and
initial retry delay can be configured with the `MODELMESH_MODELS_DEV_*` variables documented in
`backend/.env.example`; a custom URL should only point to a trusted internal mirror. The backend
preserves each upstream model object and converts the complete models.dev
cost structure into fixed-point prices in PostgreSQL, including input, output, reasoning,
cache-read, cache-write, audio input/output, legacy `context_over_200k`, every context tier, and
experimental-mode prices. The administrator form renders these groups dynamically and can also
store custom context tiers. Created models keep synchronized defaults and manual overrides
separately: blank fields read `default_pricing_nano_usd` and follow later catalog refreshes, while
entered values read `pricing_overrides_nano_usd` and remain fixed until an administrator changes
them. Custom models store their administrator-maintained baseline directly in
`default_pricing_nano_usd`. Customer-facing model responses use the effective merged price book
from the `models` table and do not depend on a live models.dev lookup.

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
self-service APIs. Current-user snapshots are cached in Redis under
`modelmesh:auth:user:v1:{user_id}` for one day; cache misses fall back to PostgreSQL and refill the
entry. Account-center route metadata and role visibility are stored in PostgreSQL.
The frontend loads the current account's visible routes from `GET /api/account-routes` instead of
inferring access from a hard-coded role hierarchy. Administrators can inspect and update the role
matrix through `GET /api/admin/account-routes` and
`PUT /api/admin/account-routes/{route_key}/roles`.
Visible route lists are cached in Redis under `modelmesh:account-routes:v7:user:{user_id}` for one
day. The administrator's full route permission matrix is cached under
`modelmesh:account-routes:v7:admin:matrix` for the same duration. Cache entries include their
scope, so user-visible lists and the administrator matrix cannot be mixed. A route permission
update deletes the matrix cache and every affected user's visible-route cache in one Redis
operation.

Merchant and administrator accounts also receive database-controlled merchant routes for the
operations dashboard, channels, model listings, usage logs, withdrawal requests, business
requests, merchant profile, and support tickets. Channel management is persisted in PostgreSQL and
scoped to the authenticated merchant account; the remaining merchant screens currently provide
responsive UI preview data.

Merchant channels are managed through:

- `GET /api/merchant/channel-providers`
- `GET /api/merchant/channels`
- `POST /api/merchant/channels`
- `PUT /api/merchant/channels/{channel_id}`
- `DELETE /api/merchant/channels/{channel_id}`

Channel names are unique per merchant, ignoring case. The provider picker is sourced from active
brands configured by an administrator, and create/update requests reference the selected
`providerId`; arbitrary provider names are rejected. Existing channels keep their provider
association when an administrator hides that brand, so merchants can still take them offline or
delete them. Merchant writes can set a channel to `active` or `offline`; `degraded` is reserved for
health-check output. Provider credentials are not accepted by this contract and must not be stored
by the frontend.

Administrator accounts receive additional database-controlled routes for the operations overview,
user and merchant management, marketplace brand and model catalog management, platform-wide usage
records, withdrawal review, an immutable financial ledger, channel and model reviews, risk alerts,
audit logs, ticket management, route access, and system settings. The administration screens
currently use responsive preview data;
financial amounts are represented as integer micro-USD values so the later API contract does not
depend on floating-point money.

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
| `13000-13999` | Account route errors          |
| `14000-14999` | Brand management errors       |
| `15000-15999` | Model catalog lookup errors   |
| `16000-16999` | Model management errors       |
| `17000-17999` | User management errors        |
| `18000-18999` | Merchant management errors    |
| `19000-19999` | Merchant channel errors       |
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
