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
experimental-mode prices with their own context tiers. When an upstream mode only publishes its
short-context rates, the backend derives its longer-context rates from the matching standard tier
ratios. The administrator form renders these groups dynamically and can also store custom context
tiers. Created models keep synchronized defaults and manual overrides
separately: blank fields read `default_pricing_nano_usd` and follow later catalog refreshes, while
entered values read `pricing_overrides_nano_usd` and remain fixed until an administrator changes
them. Custom models store their administrator-maintained baseline directly in
`default_pricing_nano_usd`. Customer-facing model responses use the effective merged price book
from the `models` table and do not depend on a live models.dev lookup.
Merchant provider channels keep their HTTPS base URL, description, and discovered model IDs in
PostgreSQL. Provider API keys are encrypted with AES-256-GCM before persistence and are never
returned by the API. Production deployments must set a stable
`MODELMESH_PROVIDER_CREDENTIAL_SECRET` of at least 32 characters; losing or rotating it without a
credential migration makes existing provider keys unreadable. Development has an explicit
local-only default so existing setup commands keep working. Model discovery runs through the
backend with bounded timeouts, redirects disabled, and private network destinations blocked.
Administrators maintain a platform-wide set of supported pricing currencies and fixed rates,
each expressed as `1 USD = N price-currency units`. The synchronized model catalog remains an
unmodified USD source. USD is always present as the non-removable default at rate `1`; when no
additional currency is configured, it is the merchant's only available choice. Merchant listing
forms let the merchant choose one configured currency and either keep the numeric values at `1:1`
or convert the complete source price book with the administrator-maintained fixed rate. The
merchant can then apply a sales multiplier or per-rate overrides, and the backend normalizes the
saved listing back to USD with checked fixed-point arithmetic. `1:1` is the default and changing
the currency only changes the unit; fixed-rate submissions must still match the current
administrator configuration, so stale forms are rejected and refreshed. The customer-facing
contract therefore stays in USD and never depends on a live exchange-rate provider.

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
requests, merchant profile, and support tickets. Channel management, model listings, business
requests, and merchant profiles are persisted in PostgreSQL and scoped to the authenticated
merchant account; the remaining merchant screens currently provide responsive UI preview data.

Merchant channels are managed through:

- `GET /api/merchant/channel-providers`
- `GET /api/merchant/channels`
- `POST /api/merchant/channels`
- `PUT /api/merchant/channels/{id}`
- `DELETE /api/merchant/channels/{id}`

Channel responses keep an internal UUID in `id` for mutations and relationships, and expose a
separate auto-incrementing `channelId` for display and search. Deleted channel numbers are not
reused.

Channel model selection keeps `availableModels` (the complete discovered or manually entered
option set) separate from `supportedModels` (the enabled subset). Create and update requests accept
both fields, and the backend always merges enabled models into the available set for compatibility
with older clients that omit `availableModels`.

Channel names are unique per merchant, ignoring case. The provider picker is sourced from active
brands configured by an administrator, and create/update requests reference the selected
`providerId`; arbitrary provider names are rejected. Existing channels keep their provider
association when an administrator hides that brand, so merchants can still take them offline or
delete them. Merchant channels use one status field with four values: `pending`, `rejected`,
`offline`, and `active`. New channels and material edits enter `pending`; approval changes them to
`active`, while rejection changes them to `rejected`. Approved channels can then be switched
between `active` and `offline`. After approval, the channel name, provider, and description are
immutable; connection credentials, base URL, supported models, and runtime status remain editable
without another review. The catalog review API derives its `approved` filter from both approved
channel states.

Merchant model listings are managed through:

- `GET /api/merchant/model-options?channelId={channel_id}`
- `GET /api/merchant/models`
- `POST /api/merchant/models`
- `PUT /api/merchant/models/{listing_id}`
- `PUT /api/merchant/models/{listing_id}/status`
- `DELETE /api/merchant/models/{listing_id}`

Merchant business requests are managed through:

- `GET /api/merchant/requests?page=1&pageSize=20&query=gpt-5&status=completed&sortBy=submittedAt&sortOrder=desc`
- `POST /api/merchant/requests`

Requests accept `channelAccess`, `modelReview`, or `quotaAdjustment` as their type and start in the
`pending` review state. All manual requests, channel/model review rounds, and lifecycle operations
are stored in the canonical `merchant_business_logs` table. Each review submission creates a log
row; approval, rejection, or correction updates that review round, while activation, offline, and
deletion append immutable completed rows. Deleting a pending resource marks its open review as
`cancelled` before recording the deletion. PostgreSQL triggers write these changes atomically with
the resource mutation and snapshot resource names, including models deleted through a channel
cascade. Logs therefore remain available after the channel or listing is gone.

The list endpoint performs database pagination and stable sorting by occurrence or update time plus
log ID. It defaults to newest occurrence first (`sortBy=submittedAt&sortOrder=desc`), supports
switching either time column between ascending and descending order, defaults to 20 rows per page,
accepts page sizes from 1 to 100, searches raw log subjects/details, and filters by
`pending`, `changesRequested`, `approved`, `completed`, or `cancelled`. Management-list timestamps
are rendered with second precision in both supported locales. Deleting an entire user intentionally
removes that user's private logs together with the account.

Merchant profiles and settlement accounts are managed through:

- `GET /api/merchant/profile`
- `PUT /api/merchant/profile`
- `GET /api/merchant/settlement-settings`
- `POST /api/merchant/settlement-accounts`
- `PUT /api/merchant/settlement-accounts/{id}/default`
- `DELETE /api/merchant/settlement-accounts/{id}`

Administrators configure which settlement methods and USDT networks may be used for new accounts
through `GET /api/admin/settlement-settings` and `PUT /api/admin/settlement-settings`. The system
settings page persists those switches in PostgreSQL. Disabling an option removes it from the
merchant account form and is checked again transactionally when the account is created; existing
settlement accounts remain available and are not deleted.

The profile is created during migration or lazily on first access and receives a stable merchant
number. A merchant can configure up to ten settlement accounts. Supported methods are bank cards,
Alipay, and USDT wallets. Bank cards may use CNY or USD, Alipay uses CNY, and USDT wallets use USDT.
New USDT wallets must select TRC20, ERC20, BEP20 (BNB Smart Chain), or
Polygon; wallet addresses are validated against the selected network's address shape. The first
account becomes the default. Switching the default and deleting an account are transactional, and
deleting a default account automatically promotes the oldest remaining account. Full payment
account and wallet values are encrypted with the backend credential encryption key. API responses,
application logs, and the merchant interface receive only the stored masked representation.
Alipay settlement accounts require both a recipient name and the phone number linked to that
Alipay account; the normalized phone number is encrypted and only its masked form is returned.

Administrator pricing settings are managed through:

- `GET /api/admin/price-settings`
- `PUT /api/admin/price-settings`

Each listing joins one owned channel to one published administrator model. The channel provider and
model brand must match, the context window is inherited from the administrator model, and a channel
cannot list the same model twice. Each listing persists integer USD nano-unit values per million
tokens. The administrator's pricing configuration always contains USD and can additionally include
any subset of CNY (RMB), EUR, GBP, JPY, HKD, SGD, AUD, CAD, KRW, and USDT, with one manually
controlled fixed rate per configured currency. The listing form inherits
the administrator model's complete pricing shape,
including base input/output, cache rates, context tiers, experimental modes such as `fast`, and
service tiers. Merchants choose either `parity` conversion, which keeps entered numbers unchanged
across currencies, or `fixedRate` conversion, which uses the administrator's current rate. They can
apply one sales-price multiplier to recalculate every supported rate, then optionally fine-tune
individual prices before saving. Create and update requests carry the conversion mode and displayed
rate snapshot; removed currencies and stale fixed rates are rejected, and the frontend refreshes
the price book before a retry. A listing now has an independent runtime status (`published` or
`offline`) and review status (`pending`, `approved`, or `rejected`). Creating a listing starts an
initial review while the runtime status remains `offline`. After the first approval, editing the
price never removes the model or changes its runtime status. The administrator configures a global
price-increase threshold and an approval-to-effective delay through the price-settings API. A
decrease or an increase at or below the threshold applies immediately. An increase above the
threshold is stored separately as a proposed price while the current approved price continues to
serve traffic. Approval schedules the proposed price for the configured number of hours; a zero
delay applies it immediately. Until the effective time, administrators can correct the decision and
merchants can see both the current and proposed prices. Approved listings can be switched between
`published` and `offline` without deleting channel or pricing data. Removing a listing or catalog
model also keeps the channel model count synchronized.

Channel and model review queues are managed through:

- `GET /api/admin/catalog-reviews?kind={channel|model}&page=1&pageSize=20`
- `POST /api/admin/catalog-reviews/{review_id}/test-connection`
- `POST /api/admin/catalog-reviews/{review_id}/test-model`
- `POST /api/admin/catalog-reviews/{review_id}/review`

The list supports a text query plus `pending`, `approved`, and `rejected` status filters. The review
request includes the status last seen by the administrator, so initial decisions and later
corrections both reject stale concurrent updates instead of overwriting them. The interface asks for
confirmation before saving a decision, and completed reviews can be corrected from their detail
dialog. Before reviewing a channel, an
administrator can test its stored endpoint and encrypted credential against the upstream models
API; the response reports latency and discovered model count without exposing credentials or the
upstream response body. Model reviews can run randomized live inference verification without first
querying the upstream models list. Three independent challenges and one follow-up conversation
check input fidelity, exact output structure, multi-turn context, request parameter handling, token
accounting, content integrity, repeated-call stability, and routing consistency. The response
contains only check statuses, latency, reported model identifiers, endpoint trust classification,
and provider fingerprints; channel credentials, prompts, and raw model output remain server-side.

Administrator accounts receive additional database-controlled routes for the operations overview,
user and merchant management, marketplace brand and model catalog management, platform-wide usage
records, withdrawal review, an immutable financial ledger, channel and model reviews, risk alerts,
audit logs, ticket management, route access, and system settings. The administration screens other
than the pricing currency card and channel/model review queues currently use responsive preview data;
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

| Range         | Purpose                          |
| ------------- | -------------------------------- |
| `10000-10999` | Common request errors            |
| `11000-11999` | Authentication errors            |
| `12000-12999` | API key management errors        |
| `13000-13999` | Account route errors             |
| `14000-14999` | Brand management errors          |
| `15000-15999` | Model catalog lookup errors      |
| `16000-16999` | Model management errors          |
| `17000-17999` | User management errors           |
| `18000-18999` | Merchant management errors       |
| `19000-19999` | Merchant channel errors          |
| `20000-20999` | Merchant model listing errors    |
| `21000-21999` | Price settings errors            |
| `22000-22999` | Catalog review errors            |
| `23000-23999` | Merchant business request errors |
| `24000-24999` | Merchant profile errors          |
| `90000-99998` | Infrastructure errors            |
| `99999`       | Unknown internal server error    |

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
