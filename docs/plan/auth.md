# auth/ work plan — email OTP sign-in and an eligibility store

Follows the valo implementation (`~/Documents/p/lmv/valo/valo-backend/api`)
for the login flow, session mechanism, and provider integration. Where this
plan diverges, the divergence is called out with the reason.

## Scope

1. **Sign-in gates both the SPA and `/v1/*`.** `VISHNU_*` config is
   required: with auth always on, there is no unauthenticated mode.
2. **Identity is an email address plus a one-time code** emailed through
   Brevo. No passwords anywhere.
3. **An eligibility store in Postgres** lists who may sign in, and a row
   can be disabled or removed with immediate effect.

The API behind this gate grants **arbitrary shell execution through the
agent** (see [`../PLAN.md`](../PLAN.md) "Security posture"), so this is
authorization for a shell, not for read-only data.

## Why the shape is what it is

- **`EventSource` cannot set request headers.** A bearer token in an
  `Authorization` header would authenticate REST and silently break
  `GET /v1/workspaces/{id}/events`, the app's entire liveness model. Valo
  solves this the same way: a JWT in an `HttpOnly` cookie (its handler
  sets the cookie *and* mirrors `Authorization: Bearer …` for API clients),
  with `GetMe` returning claims so the frontend never touches the raw JWT.
- **Postgres rather than valo's Redis.** Valo keeps OTPs, attempt
  counters, Fibonacci rate-limit state, and the user's token set in Redis
  (`internal/repository/user_token_repository.go`). This deployment has
  Postgres and no Redis, so every one of those becomes a table with an
  explicit `expires_at`. The real cost is that Postgres has no key TTL:
  expired rows need a sweep (below), which Redis would have done for free.
- **Email + OTP rather than phone + PIN.** Valo's `/login` is phone+PIN and
  its OTP flows are registration and PIN reset. Here the OTP *is* the
  login, so `/auth/login` verifies the code and issues the session in one
  step, and there is no credential to reset.

## Data model (Postgres)

Mirrors valo's `users` table (`api/migration/create_users_table.sql`) for
the user row, including its `set_updated_at` trigger pattern.

```sql
-- migration/create_users_table.sql — the eligibility allowlist
CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY,
    email       VARCHAR(255) NOT NULL UNIQUE,
    name        VARCHAR(255) NOT NULL DEFAULT '',
    status      VARCHAR(25) NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'inactive')),
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- migration/create_auth_otp_table.sql — one live code per (email, purpose)
CREATE TABLE IF NOT EXISTS auth_otp (
    email       VARCHAR(255) NOT NULL,
    purpose     VARCHAR(25) NOT NULL DEFAULT 'login',
    code_hash   TEXT NOT NULL,
    attempts    INTEGER NOT NULL DEFAULT 0,
    expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (email, purpose)
);

-- migration/create_auth_rate_limit_table.sql — Fibonacci back-off state
CREATE TABLE IF NOT EXISTS auth_rate_limit (
    email            VARCHAR(255) NOT NULL,
    purpose          VARCHAR(25) NOT NULL DEFAULT 'login',
    request_count    INTEGER NOT NULL DEFAULT 0,
    next_allowed_at  TIMESTAMP WITH TIME ZONE NOT NULL,
    reset_at         TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (email, purpose)
);

-- migration/create_auth_sessions_table.sql — revocation / logout-everywhere
CREATE TABLE IF NOT EXISTS auth_sessions (
    token_hash  TEXT PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    user_agent  TEXT NOT NULL DEFAULT '',
    ip_address  VARCHAR(64) NOT NULL DEFAULT '',
    expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at  TIMESTAMP WITH TIME ZONE,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions (user_id);
```

`auth_otp` is keyed on the email rather than `user_id` so a code can be
issued before eligibility is resolved, and so an unknown address leaves no
user-shaped trace. `code_hash` is a SHA-256 of the code (valo's `HashOTP`),
compared in constant time — bcrypt is unnecessary for a 6-digit code that
lives 5 minutes under a 3-attempt cap.

**Expiry sweep**: a single `DELETE FROM auth_otp WHERE expires_at < now()`
and the same for `auth_rate_limit`, run opportunistically on each OTP
request (cheap with the primary key) and/or on a ticker. No cron, no
extension.

Migrations follow valo's convention: numbered `.sql` files under
`api/migration/` plus an applied-migrations table
(`migration/create_migrations_table.sql`), run by a small runner — no new
Go dependency.

## Flow

```
browser                     api (vishnu)                       Brevo
  │ POST /auth/otp {email}      │
  ├────────────────────────────►│ eligibility check (users.status)
  │                             │ rate limit (Fibonacci) → 429 + retry_after
  │                             │ generate 6-digit code, store SHA-256 hash
  │                             ├───────────────────────────────────►│ POST /v3/smtp/email
  │◄────────────────────────────┤ 200 {expire_at, retry_after}
  │ POST /auth/verify {email, otp}
  ├────────────────────────────►│ verify (constant time, ≤3 attempts)
  │                             │ INSERT auth_sessions, sign JWT
  │◄────────────────────────────┤ 200 + Set-Cookie (session)
  │ GET /auth/me                │
  │◄────────────────────────────┤ 200 {user_id, email, name}
```

### OTP mechanics (from valo)

| Setting | Value | Valo source |
| --- | --- | --- |
| Code | 6 digits, `crypto/rand` | `auth_usecase.go` |
| Lifetime | 5 minutes | `otp_rate_limit.go` ("5-minute OTP window") |
| Max wrong attempts | 3, then locked for the remaining TTL | `otpVerificationMaxAttempts` |
| Verification | atomic, constant-time, counter and code deleted on success | `VerifyOTP` |
| Re-request | Fibonacci back-off 1, 1, 2, 3, 5, 8 … minutes, capped, counter resets after 10 minutes idle | `FibOTPWaitMinutes`, `CheckFibRateLimit`, reset window |
| On failure | `retry_after` (seconds) so the client can count down | `dto.OTPResponse` |
| On send failure | rate-limit increment is rolled back via a request nonce | `RollbackFibRateLimit` |

The atomicity valo gets from Redis pipelines needs a transaction here: the
rate-limit check-and-increment and the OTP upsert run in one
`BEGIN … COMMIT`, with `SELECT … FOR UPDATE` on the `auth_rate_limit` row.

### Endpoints

| Route | Auth | Notes |
| --- | --- | --- |
| `POST /auth/otp` | open | body `{email}`; `200 {expire_at, retry_after}`; `403 not_eligible` when the address is not an active user; `429 rate_limit_exceeded` + `Retry-After` |
| `POST /auth/verify` | open | body `{email, otp}`; sets the session cookie; `401 invalid_otp` / `otp_locked` |
| `POST /auth/logout` | open | clears the cookie, marks the session row revoked |
| `GET /auth/me` | required | `{user_id, email, name}`; `401` when signed out |
| `GET /login` | open | self-contained HTML form (works with no web build present) |
| `GET /healthz` | open | unchanged liveness probe |
| `ALL /v1/*` | required | streaming proxy, behaviour unchanged once authorized |
| `ALL /*` | required | SPA + assets; HTML navigations redirect to `/login?next=…` |

Eligibility failures are deliberately explicit (`403 not_eligible`). Valo's
`/register-otp` has the same shape, and this is an invite-only tool: a
guessable-email probe that reveals "not on the list" is the better
trade-off than silently emailing nobody.

## Session

Valo's mechanism, unchanged:

- **JWT HS256**, claims `UID`, `R` (roles), `EXP` as **Unix seconds**;
  `EXP` is required and validated explicitly rather than trusted to the
  library (`jwt_utils.go`).
- **Cookie**: `HttpOnly`, `Expires = now + TOKEN_EXPIRATION_HOURS`, name
  from a constant, `SameSite` from config (**default `Strict`**), `Secure`
  from config (**default `true`**); startup refuses `SameSite=None`
  without `Secure`, because browsers drop such cookies.
- **Logout** clears the cookie with `Value: ""` and a past `Expires`, and
  revokes the session row.
- **Revocation** is the `auth_sessions` table (valo's Redis token set):
  the middleware rejects a token whose row is missing or `revoked_at` is
  set, which is what makes "disable this user" and "log out everywhere"
  take effect immediately.

Trade-off to accept: `SameSite=Strict` means a deep link into the app from
outside a browser session (an email client, a bookmark opened cold) lands
on the login page before the cookie is sent. `COOKIE_SAME_SITE=Lax` is the
override if that bites; the default stays `Strict` to match valo.

## Middleware

Order mirrors valo's route groups: **rate limiter → auth → handler**, with
the rate limiter emitting `429` and `Retry-After` before any auth work.

- Reads the cookie, decodes the JWT, checks the session row, loads the
  user, requires `status = 'active'`.
- Error codes pass through verbatim so callers can distinguish: 
  `missing_token`, `invalid_token`, `expired_token` — valo's convention,
  documented per operation in its OpenAPI specs.
- API clients (`Accept: application/json`, `/v1/*`, XHR, SSE) get `401`
  JSON; HTML navigations get `302 /login?next=…`.
- Non-GET requests: `Origin` / `Sec-Fetch-Site` check, applied centrally
  because `/v1/*` is a blind passthrough.
- The session cookie is **stripped** before proxying upstream, so the
  credential never reaches crush or its logs.
- Failures logged via `slog` without the code, the cookie, or bcrypt-style
  which-field-was-wrong detail.

## Email (Brevo)

Valo's sender is a small REST client (`internal/service/email/brevo.go`);
the same shape here:

- `POST {BREVO_API_URL}/v3/smtp/email` with header `api-key`, body
  `{sender, to[], subject, htmlContent, textContent, tags[]}`.
- Non-production environments prefix the subject (`[dev] …`) so test mail
  is obvious.
- Sender identity from `BREVO_FROM_EMAIL` / `BREVO_FROM_NAME`.
- Per-request timeout from a config value; failures logged with status and
  a bounded response body, never the code.
- Message body from an OTP template with an HTML rendering and a
  plain-text fallback, and i18n copy (`id` default, `en`), mirroring
  `GenerateOTPEmailContent(code, recipientName, lang, expirationMinutes)`.
  Vishnu's template is its own (valo's carries Valopay branding and a
  storage-bucket logo); copy only the structure, not the assets.

Reuse the **`BREVO_*` variable names verbatim** so the credentials already
in the environment work. App-specific settings keep the `VISHNU_` prefix
instead of reusing valo's `JWT_SECRET` / `TOKEN_EXPIRATION_HOURS`, because
both projects run from the same shell and a shared secret would silently
couple their token lifetimes.

## Eligibility store and CLI

Eligibility is a row in `users` with `status = 'active'`. There is no
password to set, so the CLI is purely membership:

```
vishnu-users add <email> [--name "…"]   # insert as active
vishnu-users list                       # id, email, status, created_at
vishnu-users disable <email>            # status='inactive' → immediate lockout
vishnu-users enable <email>
vishnu-users remove <email>             # deletes the row (sessions cascade)
```

Disabling is the revocation primitive: the middleware re-reads the row on
every request, and `auth_sessions` is deleted by the `ON DELETE CASCADE`
on removal. A user holding a valid JWT is locked out on their next request.

## Config

| Env | Default | Required | Purpose |
| --- | --- | --- | --- |
| `VISHNU_DATABASE_URL` | — | yes | Postgres DSN for the eligibility store and auth tables |
| `VISHNU_JWT_SECRET` | — | yes | HS256 signing key, ≥32 bytes (valo's rule) |
| `VISHNU_TOKEN_EXPIRATION_HOURS` | `168` | no | session lifetime |
| `BREVO_API_KEY` | — | yes | Brevo transactional API key |
| `BREVO_API_URL` | `https://api.brevo.com` | no | endpoint base |
| `BREVO_FROM_EMAIL` | — | yes | sender address |
| `BREVO_FROM_NAME` | — | no | sender display name |
| `COOKIE_SAME_SITE` | `strict` | no | `strict` / `lax` / `none` |
| `COOKIE_SECURE` | `true` | no | `false` only for local HTTP |

Startup validation follows valo's config checks and fails closed with the
full list of problems at once: missing DSN, missing or <32-byte secret,
unknown `SameSite`, `SameSite=None` without `Secure`, and any missing
Brevo credential.

## Files

```
api/internal/config/config.go              + the table above, validated at startup
api/internal/auth/otp.go                   generate/hash/verify, TTL, attempt cap
api/internal/auth/ratelimit.go             Fibonacci back-off (valo's math verbatim)
api/internal/auth/jwt.go                   encode/decode, EXP validation, claim keys
api/internal/auth/cookie.go                set/clear, SameSite/Secure normalization
api/internal/auth/middleware.go            rate limit → auth → CSRF origin check
api/internal/auth/handler.go               /auth/otp, /auth/verify, /auth/logout, /auth/me, /login
api/internal/repository/user_repository.go      users (allowlist)
api/internal/repository/otp_repository.go       auth_otp + auth_rate_limit (transactional)
api/internal/repository/session_repository.go   auth_sessions
api/internal/service/email/brevo.go        Brevo REST client
api/internal/service/email/otp_template.go OTP email, HTML + text, id/en
api/migration/*.sql                        schema, valo naming convention
api/migration/runner.go                    sequential apply + migrations table
api/cmd/users/main.go                      add / list / disable / enable / remove
api/cmd/server/main.go                     wiring + startup validation
api/internal/service/upstream_service.go   strip the session cookie upstream
web/src/services/auth.ts                   otp / verify / logout / me calls
web/src/features/auth/LoginPage.tsx        email step → code step with retry_after countdown
web/src/features/topbar/TopBar.tsx         signed-in email + logout
```

Layering stays nexus/valo style: `cmd` → `config` → `repository`/`service`
→ `handler`, interfaces declared where they are consumed, concrete types
unexported behind exported constructors.

## Consequences to accept

- **The Vite-direct dev path stops working as-is.** `bun run dev` proxies
  `/v1` straight to crush and never touches the Go process, so with auth
  always on it reaches an unauthenticated upstream. Dev runs through the
  Go proxy (`make dev`, serving `../web/dist`), or a dev-only bypass flag
  gets added deliberately — not by accident.
- **Postgres becomes a runtime dependency for sign-in.** `crush` itself
  still needs no database; if Postgres is down, nobody can log in even
  though the agent is fine.
- **No native TTL**, hence the sweep described above.
- Still no password, so there is no reset flow, no password policy, and
  nothing hashed with bcrypt.

## Testing

First Go tests in the repo.

- `auth/otp_test.go`: code format, hash/verify round-trip, constant-time
  mismatch, expiry boundary, attempt cap → locked, attempts reset on new
  code.
- `auth/ratelimit_test.go`: the Fibonacci sequence and its cap, reset
  window, nonce rollback.
- `auth/jwt_test.go`: round-trip, tampered signature, missing `EXP`,
  expired `EXP`, secret rotation.
- `repository/*_test.go` against a real Postgres (valo's `repositorytest`
  package is the pattern) — requires a test DSN; if that is unavailable,
  these run behind a build tag rather than being faked away.
- `auth/middleware_test.go` + `handler_test.go` (fiber + `httptest`):
  `/v1/*` without a cookie → 401 **including the SSE path**; `/` HTML →
  302 `/login`; otp request for a non-eligible address → 403; wrong code
  → 401 and the counter increments; correct code → cookie, then `/v1/*`
  passes; disabled user's existing cookie → 401; logout revokes;
  `/healthz` stays open; rate limit → 429 with `Retry-After`.
- Manual: phone over Tailscale, PWA standalone cookie persistence, and
  disabling a user while their tab and event stream are open.

## Rollout order

1. Migrations + repositories + `users` CLI (no serving changes).
2. OTP + rate limit + Brevo sender + template, with tests.
3. JWT/cookie + middleware + `/auth/*` routes + startup validation.
4. Web login page, `/auth/me` header state, logout.
5. Fold the outcome into `docs/PLAN.md` and `../../AGENTS.md`; record the
   dev-mode decision.

## Verification

```bash
cd api && go build ./... && go vet ./... && go test ./...
~/go/bin/golangci-lint run ./...   # not on PATH by default; see AGENTS.md

curl -i localhost:8080/                        # 302 → /login
curl -iN 'localhost:8080/v1/workspaces/w/events?client_id=c'   # 401, never a stream
curl -ic c.txt -H 'Content-Type: application/json' \
     -d '{"email":"me@example.com"}' localhost:8080/auth/otp   # 200 + retry_after
curl -ib c.txt -H 'Content-Type: application/json' \
     -d '{"email":"me@example.com","otp":"123456"}' localhost:8080/auth/verify
curl -ib c.txt localhost:8080/auth/me          # 200 with the user
```

## Open questions

- [ ] OTP lifetime (5 min), attempt cap (3), and the Fibonacci ceiling —
      keep valo's values as-is, or shorten for a localhost tool?
- [ ] Email copy language: `id` default with `en` (valo's choice).
- [ ] Error body shape for app-owned routes: valo's
      `{code, message, retry_after, errors[]}` envelope, or crush's bare
      `{message}` for consistency with `/v1/*`?
- [ ] Dev-mode auth: always run through `make dev`, or add an explicit
      `VISHNU_AUTH_DEV_BYPASS` for the Vite path?
- [ ] `GET /auth/activity` (valo's login history) — in scope, or later?
- [ ] Is a Postgres test database available for repository tests, or do
      they run behind a build tag?
