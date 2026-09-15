# Akedly Backend

The Akedly API — automated e-commerce order confirmation. Shopify order →
WhatsApp confirmation → voice fallback on no response → confirmed order,
visible in the merchant dashboard. Standalone Node.js/TypeScript/Express
service, independent of the Next.js marketing site in `frontend/`.

> **Status: MVP complete.** Auth, Shopify OAuth + webhooks, WhatsApp Cloud
> API, Twilio voice fallback, the central confirmation state machine, and
> merchant-scoped dashboard/order APIs are all implemented, typechecked,
> built, and covered by tests that run against a real MongoDB. See
> **Known limitations** below for what's deliberately out of scope or
> simplified for the MVP.

## Stack

- Node.js + TypeScript (strict)
- Express 5
- MongoDB / Mongoose
- Zod for request validation
- JWT in an httpOnly cookie for auth; bcrypt for password hashing
- Vitest + Supertest for tests (see "Why Vitest, not Jest" below)
- `tsx` for the dev server (no build step needed locally)

## Setup

```bash
cd server
npm install
cp .env.example .env
```

At minimum, set `MONGODB_URI` to get real persistence (the server still
starts without it, but nothing will actually save). Everything else in
`.env.example` is documented inline — set only what the feature you're
testing needs (see the table below).

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server with auto-reload (`tsx watch`) |
| `npm run build` | Type-check and compile to `dist/` |
| `npm start` | Run the compiled server from `dist/` (run `build` first) |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run typecheck` | Type-check without emitting output |

## Architecture

```
Route → Controller → Service → Integration → Provider API
```

- `src/app.ts` / `src/server.ts` — Express app assembly / process entrypoint
- `src/config/` — typed env config, MongoDB connection (incl. index sync — see below)
- `src/middleware/` — request logging, auth guard, body validation, error handling
- `src/models/` — Mongoose schemas (Merchant, Customer, Order, ConfirmationAttempt, Communication, Conversation, Call, WebhookEvent)
- `src/services/` — business logic; `ConfirmationService` is the single authority for order status transitions
- `src/integrations/` — provider-specific code (Shopify OAuth/GraphQL/webhooks, Meta WhatsApp, Twilio voice), each behind an interface the services depend on instead
- `src/controllers/` — thin HTTP-layer glue; no business logic
- `src/routes/v1/` — versioned routes, mounted at `/api/v1`
- `src/jobs/` — the (dev-only, see below) background job queue behind the `JobQueue` interface
- `src/validation/` — Zod schemas
- `src/utils/` — logger, `AppError`, response envelope, token encryption, mongo-error helpers

Every API response follows one of two shapes:

```json
{ "success": true, "data": {} }
{ "success": false, "error": { "code": "SOME_CODE", "message": "..." } }
```

### Multi-tenancy

Every merchant-owned query is scoped by `req.merchantId`, set only by
`authGuard` from the verified JWT — never from a client-supplied
`merchantId` in the body/query/params. `OrderService.getOrderForMerchant`
is the one place order ownership is checked; every order-scoped route
goes through it (confirmed live: a second merchant fetching another
merchant's order ID gets a 404, not the order).

### The confirmation state machine

`ConfirmationService` is the only code allowed to change an order's
status. Allowed transitions:

```
PENDING_CONFIRMATION → CONFIRMED
PENDING_CONFIRMATION → CANCELLED
PENDING_CONFIRMATION → EXPIRED
```

Anything else (e.g. a stale/duplicate webhook trying `CONFIRMED →
CANCELLED`) is rejected with `409 INVALID_ORDER_TRANSITION`. Confirming
or cancelling an order that's already in that exact state is a no-op
(idempotent), not an error — this is what makes duplicate WhatsApp/voice
webhook deliveries safe.

### Idempotency

Three layers, from fastest/first-checked to most fundamental:

1. `WebhookEvent` — a `(provider, externalEventId)` unique index rejects
   a webhook body Akedly has already recorded.
2. `Order`'s `(merchantId, shopifyOrderId)` unique index — the real
   guarantee against duplicate orders, independent of #1.
3. `ConfirmationService`'s state-machine no-op behavior — the real
   guarantee against a duplicate confirm/cancel corrupting order state.

**Important Mongoose gotcha this project hit and fixed:** indexes are
built in the background after `mongoose.connect()`/model registration —
without explicitly waiting for that, a burst of requests in the first
moments after connecting (exactly what an idempotency test does: fire
the same webhook twice, fast) can land before the unique index actually
exists, silently defeating it. `connectDB()` (and the test DB helper)
call `await mongoose.syncIndexes()` after connecting specifically to
close this window.

## API reference

All routes are under `/api/v1`.

**Auth** — `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`

**Shopify integration** (all require auth) — `GET /integrations/shopify/install?shop=<x>.myshopify.com`, `GET /integrations/shopify/callback`, `GET /integrations/shopify/status`, `POST /integrations/shopify/disconnect`

**Shopify webhooks** (HMAC-verified, no auth) — `POST /webhooks/shopify/orders/create`, `POST /webhooks/shopify/orders/updated`

**WhatsApp webhook** (signature-verified) — `GET /webhooks/whatsapp` (Meta's verify challenge), `POST /webhooks/whatsapp` (inbound button replies + delivery/read status)

**Voice** — `POST /calls/:orderId` (auth; manually trigger the voice fallback for a pending order)

**Voice webhooks** (Twilio-signature-verified, no auth — Twilio can't hold our JWT) — `POST /webhooks/voice/twiml/:orderId` (what to say), `POST /webhooks/voice/gather/:orderId` (DTMF digit), `POST /webhooks/voice/status/:orderId` (call status)
> Deviation from the original PRD's single generic `POST /webhooks/voice`: Twilio's call flow genuinely needs three distinct callbacks (TwiML to speak, DTMF result, status change), each with a different response shape — one endpoint couldn't serve all three.

**Orders** (all require auth + tenant-scoped) — `GET /orders` (filters: `status`, `confirmationMethod`, `from`, `to`; paginated via `page`/`limit`), `GET /orders/:id`, `POST /orders/:id/confirm`, `POST /orders/:id/cancel`, `POST /orders/:id/retry-confirmation`, `GET /orders/:id/communications` (merged Communication + Call + ConfirmationAttempt timeline)

**Dashboard** (auth) — `GET /dashboard/overview` (total/pending/confirmed/cancelled/expired counts + confirmation rate)

**Health** — `GET /health`. **Demo route** — `GET /protected-test` (proves `authGuard` works standalone; not a real feature).

## Environment variables

| Variable | Required for | Notes |
|---|---|---|
| `NODE_ENV`, `PORT` | Always | Defaults: `development`, `5000` |
| `MONGODB_URI` | Real persistence | Server still starts without it (logs a warning) |
| `FRONTEND_URL` | CORS | Origin allowed with credentials |
| `PUBLIC_APP_URL` | Voice | This server's own public HTTPS URL (ngrok in dev) — Twilio callback URLs are built from it |
| `JWT_SECRET` | Sessions surviving a restart | Auto-generates an ephemeral one in dev if unset; **required** in production |
| `TOKEN_ENCRYPTION_KEY` | Shopify tokens surviving a restart | Same ephemeral-in-dev/required-in-prod pattern — if it changes, previously-encrypted Shopify tokens become unreadable and merchants must reconnect |
| `SHOPIFY_CLIENT_ID`, `SHOPIFY_API_SECRET`, `SHOPIFY_APP_URL` | Shopify OAuth/webhooks | From a Partner app at partners.shopify.com |
| `SHOPIFY_SCOPES` | Shopify OAuth | Defaults to `read_orders,read_customers` — don't widen without a concrete feature needing it |
| `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` | Sending WhatsApp messages | From the Meta Business dashboard |
| `WHATSAPP_APP_SECRET` | WhatsApp webhook verification | |
| `WHATSAPP_VERIFY_TOKEN` | WhatsApp webhook subscription | Any string you choose; Meta echoes it back |
| `VOICE_PROVIDER` | — | Defaults to `twilio` |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | Placing real calls | Without these, voice falls back to `MockVoiceProvider` (logs loudly, places no real call — see below) |

## Provider credentials: what works without them

Per the "never fake a successful external call" rule, missing credentials
never produce a fake success — they fail clearly and specifically:

- **No Shopify credentials**: OAuth install/callback throw `503
  SHOPIFY_NOT_CONFIGURED`. Everything else works.
- **No WhatsApp credentials**: `ConfirmationService.startConfirmation`
  still creates the `ConfirmationAttempt`, then the send throws `503
  WHATSAPP_NOT_CONFIGURED` — caught and recorded as a `FAILED` attempt
  (visible in the order's timeline), not a crashed request. Confirmed live.
- **No Twilio credentials**: `voice-provider-factory` falls back to
  `MockVoiceProvider`, which logs a loud warning and returns a fake call
  ID — it never pretends to be Twilio. Set the three `TWILIO_*` vars to
  use the real one.

This means the full order → attempt-recorded → manual-confirm →
dashboard-stats-update loop is fully testable end-to-end with zero
external credentials configured (see `tests/`), and was verified live
against a real MongoDB and the compiled server.

## Testing

```bash
npm test
```

Real MongoDB, not mocks: `tests/helpers/db.ts` downloads (once, cached)
and directly spawns a real `mongod`, connects our actual mongoose
instance to it, and tears it down after — this catches real index/query
behavior, not an approximation of it.

Current coverage: auth (register/login/duplicate/`/me`/logout/protected
route), the confirmation state machine (confirm/cancel/idempotency/
invalid-transition rejection/attempt completion), Shopify webhook
signature verification + idempotency + unrecognized-shop handling,
WhatsApp webhook verify-challenge + signature rejection, and order
tenant isolation (detail + list + unauthenticated rejection). Not yet
covered by automated tests (implemented and manually/live verified, but
worth adding before shipping): voice TwiML generation and DTMF handling,
Twilio signature verification, dashboard overview aggregation, the
voice-fallback job's timing/expiry logic.

### Why Vitest, not Jest

Phase 1/2 used Jest. Getting genuine DB-backed tests working for this
phase surfaced a real, deeply-verified bug: `mongoose.connect()` (and
even the raw `mongodb` driver directly) fails its handshake specifically
when run inside Jest, with `MongooseServerSelectionError: Missing
required sub-document 'driver' in the client metadata document` —
reproduced against two different MongoDB server versions, always
present under Jest and never present in a plain Node script against the
same server. That points at Jest's per-test-file VM realm (a known
source of `instanceof`/`Buffer`-identity bugs for native/BSON-handling
libraries), not a server compatibility issue. Vitest doesn't sandbox
test files that way, and switching fixed it immediately with zero
changes to the actual test syntax (`describe`/`it`/`expect` are
unchanged, via `globals: true` in `vitest.config.mts`).

## Known limitations (deliberate MVP scope, not oversights)

- **In-memory job queue is dev-only.** `src/jobs/in-memory-job-queue.ts`
  uses a plain `setTimeout` — a restart or crash silently drops any
  pending voice-fallback call. **Do not deploy to production without
  replacing it** with a durable queue (BullMQ + Redis or equivalent)
  behind the same `JobQueue` interface; nothing else would need to change.
- **Stateless JWT logout.** Logout only clears the cookie; a captured
  token stays valid until it expires. Real revocation needs a
  server-side session/blacklist store — explicitly deferred (no Redis
  yet, per instruction).
- **One shared WhatsApp Business number for every merchant**, not a
  per-merchant connection. If the same customer phone number has a
  pending order with two different merchants at once, an inbound
  button-reply webhook can't safely tell which order it's for and is
  logged + skipped rather than guessed. Per-merchant WhatsApp numbers
  would remove this; it wasn't requested for the MVP.
  `Merchant.whatsapp.*` fields exist in the schema for this future case
  but aren't wired up to anything yet.
  - **Voice DTMF retry is a hardcoded single retry**, not the
  fully-configurable count implied by the original PRD — a reasonable
  MVP simplification given each retry is a fresh Twilio HTTP callback
  with no built-in place to carry a running count without more
  plumbing.
- **`orders/updated` webhook is acknowledged and logged but doesn't
  mutate the order** — no update-order-from-Shopify logic was requested
  beyond initial creation + the confirmation workflow.
- Shopify tokens are requested as **non-expiring offline access tokens**
  (no `expiring=1`), matching the PRD's simple `{shopDomain, accessToken,
  connectedAt}` model rather than the newer refresh-token rotation flow.
