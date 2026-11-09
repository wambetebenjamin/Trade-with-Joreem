# Trade with Joreem

Trade with Joreem is a risk-first trading education and bookstore site built with Next.js 15 App Router, TypeScript and Tailwind. **The website is hosted on Render. Google Sheets, accessed through a Google Apps Script Web App, is the source of truth for submitted form rows and configured public catalog data.** The active website routes live under `app/`; the original HTML pages remain as a content/reference archive.

## Data architecture

- There is no local file database, JSON data store, SQL server, ORM, Supabase project, or local database connection code.
- Browser form submissions send JSON arrays of column-keyed row objects directly to the deployed Google Apps Script Web App URL. The frontend uses `text/plain;charset=utf-8` to avoid a JSON preflight.
- Public sheet reads return JSON arrays of objects matching header names. The public read allowlist in the Apps Script sample is limited to `Books`, `Plans` and `PublicContent`.
- Contact, newsletter, access-request and journal submissions append to restricted tabs. Google Sheets does not provide user authentication, per-customer authorization or private member storage. Journal entries are not private.
- Stripe checkout still uses a small Next.js server route because Stripe secret keys must not be placed in browser code. The Stripe webhook validates Stripe's signature server-side, then forwards verified events to Apps Script with a separate server-only shared secret. It does not use a database.

## Run locally

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Marketing routes render without provider keys. Form/data operations require `NEXT_PUBLIC_GOOGLE_SCRIPT_WEBAPP_URL`. For browser requests, replace the placeholder with your deployed Apps Script `/exec` URL. Set the server-side `GOOGLE_SCRIPT_WEBAPP_URL` to the same URL for verified Stripe webhook forwarding.

## Deploy the frontend on Render

1. Create a Render **Web Service** from this repository and choose the active branch to deploy.
2. Build command: `npm ci && npm run build`
3. Start command: `npm start` (the Next.js server binds to `0.0.0.0` and reads Render's `PORT`).
4. Add `NEXT_PUBLIC_SITE_URL` using the Render public URL or confirmed custom domain.
5. Add `NEXT_PUBLIC_GOOGLE_SCRIPT_WEBAPP_URL` (public frontend endpoint) and `GOOGLE_SCRIPT_WEBAPP_URL` (same URL, server-side).
6. Add Stripe test-mode variables only if you are testing checkout. Keep live payments disabled until the release gates below pass.

Do not deploy the old static HTML as the Render service root; the Next.js application owns the public routes. After deployment, test the contact form from the actual Render origin because Apps Script cross-origin response behavior must be confirmed in a real browser.

## Google Sheets + Docs/Slides setup

Follow [`GOOGLE_APPS_SCRIPT_SETUP.md`](./GOOGLE_APPS_SCRIPT_SETUP.md). It contains the complete `doGet`/`doPost` script, tab contracts, document/slide automation actions, shared-secret setup and Render environment variables. Deploy the Apps Script Web App as **you**, with access set to **Anyone** for direct browser submissions. The script appends only to named form tabs and publicly reads only `Books` and `PublicContent`.

Anyone who obtains the public Apps Script URL can submit to the allowlisted form tabs. Protect the spreadsheet itself, restrict editors, avoid collecting sensitive data and add anti-abuse controls before production traffic. Never expose private records through `doGet`.

## Stripe test setup (optional)

Set test-mode values in Render or `.env.local`:

- `STRIPE_SECRET_KEY` (test key), `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_FOUNDATION_MONTHLY`, `STRIPE_PRICE_FOUNDATION_ANNUAL`, `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_ANNUAL`, `STRIPE_PRICE_ELITE_MONTHLY`, `STRIPE_PRICE_ELITE_ANNUAL`
- `STRIPE_PRICE_FOREX_MASTERY`, `STRIPE_PRICE_CRYPTO_SIGNALS`, `STRIPE_PRICE_TRADING_PSYCHOLOGY`, `STRIPE_PRICE_STOCKS_FROM_ZERO`, `STRIPE_PRICE_BUNDLE`
- `STRIPE_START20_COUPON_ID` for the eligible monthly Foundation/Pro promotion
- `STRIPE_SHIPPING_RATE_ID` and `PRINT_FULFILLMENT_ENABLED=true` only after shipping operations are ready
- `MEMBERSHIP_DELIVERY_ENABLED=true` and `DIGITAL_DELIVERY_ENABLED=true` only after secure member access / file delivery exists
- `GOOGLE_SCRIPT_WEBHOOK_SECRET`, matching the Apps Script Script Property `TWJ_STRIPE_WEBHOOK_SECRET`
- Optional server-only `GOOGLE_SCRIPT_AUTOMATION_TOKEN`, matching Script Property `TWJ_AUTOMATION_TOKEN`, for trusted Docs/Slides creation

In Stripe, set the webhook URL to `https://<your-render-host>/api/webhooks/stripe` and subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`, and `charge.refunded`. Test signed events in Stripe test mode and confirm rows appear in restricted `StripeEvents` and `Orders` tabs. The success page confirms status directly with Stripe; access/fulfilment is not provisioned by that page.

**Keep `ALLOW_LIVE_PAYMENTS=false`.** The server rejects `sk_live_`/`rk_live_` keys unless the flag is deliberately changed. Do not accept live payments until provider, catalog, tax, customer support, refund/shipping terms, final content, membership authentication and delivery have been tested. Flutterwave and Pesapal are not configured or advertised.

## Current feature limits

- No password, magic-link, session or member-auth system is implemented. The member form is an access request only.
- No protected order history, private journal, authenticated downloads, billing portal or admin data browser is implemented. Google Sheets is not an access-control system.
- The Books and mentorship-plan catalogs are loaded from the public `Books` and `Plans` sheets as arrays of row objects. Populate the documented headers; Stripe Price IDs remain authoritative for the charged price.
- Repository book PDFs are sample material, not complete paid deliverables. Do not enable digital checkout until authorized final files and secure delivery are ready.
- Contact/newsletter forms report endpoint/configuration errors rather than claiming success when the Apps Script call fails.

## Checks

```bash
npm run lint
npm run build
npm audit
```

See `SECURITY.md` and `CONTACT_SETUP.md` before collecting real data. Review the privacy/terms language and operating process before launch.
