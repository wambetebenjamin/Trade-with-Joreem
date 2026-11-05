# Trade with Joreem — Next.js rebuild

The live application is being migrated from the original static HTML pages to Next.js 15 App Router, TypeScript and Tailwind CSS. The original `.html` files and assets remain in the repository as a content/reference archive; Next.js owns the clean routes (`/`, `/mentorship`, `/bookstore`, `/about`, `/contact`, `/terms`, `/risk`, `/privacy`, `/cart`, `/login`, `/dashboard`).

## Local development

1. Install Node.js 20.9+.
2. `cp .env.example .env.local` and fill in the required **test-mode** provider configuration (details below).
3. `npm install`
4. `npm run dev` (binds to `0.0.0.0:3000` for preview environments).
5. `npm run build` before deploying.

The marketing pages run without credentials. Checkout, account sign-in, private downloads, and real contact delivery intentionally return clear setup errors until the relevant provider credentials and IDs exist; there is no fake payment or pretend account provisioning.

## Environment variables

See `.env.example`. All secret keys are server-only. Only the Supabase project URL and publishable/anon key use `NEXT_PUBLIC_` names. Never put Stripe secret keys, Supabase service-role keys, webhook secrets, Resend keys or bot tokens in client code or public variables.

### Supabase setup

1. Create/choose a dedicated Supabase project for Trade with Joreem (do not reuse an unrelated project).
2. Apply `supabase/migrations/202611050001_core_schema.sql` using the Supabase CLI or SQL editor. Review it first. It creates profiles, orders, entitlements, books, journal entries, community/print fulfillment queues and Stripe event records, with RLS enabled and no client write path for payment/admin data.
3. Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` and Vercel. The service-role key is only used by server routes and must remain private.
4. In Supabase Auth, set the site URL and allowed redirect URL to `${NEXT_PUBLIC_SITE_URL}/auth/callback`. Configure production email/SMTP delivery and the provider's built-in email/signup rate limits. Magic-link sign-in is used; admin access is determined only by `profiles.is_admin`, never by client data. Set initial admin flags through a trusted SQL/service-role procedure after verifying the intended account; users cannot promote themselves through RLS/column grants.
5. In Storage, the migration creates the private `book-files` bucket. Upload authorized PDFs using the exact file paths seeded in `books.file_path` (`crypto-signals.pdf`, `stocks-from-zero.pdf`, `forex-mastery.pdf`, `psychology.pdf`). Keep the bucket private. App download routes check a verified user's paid order or active Pro/Elite entitlement before issuing short-lived signed URLs. Do not upload files you do not own or have permission to distribute.

### Stripe test mode

1. Use Stripe **test mode** first. Create test products and prices with the existing displayed amounts (USD): Foundation $49/month and $470/year; Pro Trader $59/month and $399/year; Elite Desk $119/month and $999/year; books: Forex Mastery $59, Crypto Signals Handbook $29, Trading Psychology $49, Stocks from Zero $25, Complete Library $99. Recurring prices must use monthly/yearly intervals as named. No product ID is accepted from the browser; the server maps an allow-listed SKU to a configured Price ID.
2. Set every `STRIPE_PRICE_*` value in `.env.local`/Vercel. Create a 20% off, one-time duration coupon for `STRIPE_START20_COUPON_ID`; the app only applies it to monthly Foundation/Pro subscriptions. Annual plans, Elite Desk and books are explicitly excluded. Checkout refuses the code if the coupon is not configured.
3. Review tax obligations with the business adviser. If Stripe Tax is enabled for the account and jurisdiction, set `STRIPE_AUTOMATIC_TAX=true`; otherwise leave it false and confirm the price/tax disclosure is correct. Create a fixed-amount Stripe shipping rate in USD and set `STRIPE_SHIPPING_RATE_ID`; only then set `PRINT_FULFILLMENT_ENABLED=true` after staff are ready to process orders. Physical books and the bundle are blocked until both switches are in place. Eligible shipping destinations are defined in `app/api/checkout/route.ts`; verify the rate, destination coverage and delivery process before accepting a live order.
4. Configure Stripe Billing Portal in the Stripe Dashboard to allow subscription cancellation and approved plan/payment-method changes. The dashboard's Manage subscription button creates a portal session for the signed-in user's own Stripe customer. Upload the final, approved digital PDFs to the private storage bucket. The repository's included PDFs are labelled sample chapters and are not a complete paid deliverable. Confirm correct private storage paths and then set `books.asset_ready=true` for each fully uploaded title. Digital and bundle checkouts are blocked until this readiness check passes.
5. Run `stripe listen --forward-to localhost:3000/api/webhooks/stripe` and set the generated test `STRIPE_WEBHOOK_SECRET`. In Stripe, register the endpoint `/api/webhooks/stripe` and subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`, and `charge.refunded`. The webhook verifies the raw Stripe signature, records event IDs idempotently, and writes the order/entitlement only from server-verified events.
6. Test checkout, cancellation, duplicate webhook delivery, async payment, subscription cancellation, download authorization across two users, print queue creation and promo-code eligibility. Do not switch to live keys until all checks pass and live product/refund/shipping terms are approved. The server also rejects `sk_live_`/`rk_live_` keys unless `ALLOW_LIVE_PAYMENTS=true` is deliberately set after launch approval.

Flutterwave and Pesapal are not connected to this Stripe Checkout flow. Do not advertise them as available payment methods; integrate them with separate signed webhook and reconciliation work if requested.

### Resend, contact, fulfillment and communities

- Verify a sender domain in Resend; set `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `CONTACT_EMAIL`. The contact form reports failure instead of claiming a message was sent if delivery is unconfigured.
- Paid orders generate email with short-lived signed PDF links if the private PDFs have been uploaded. Print orders go to the protected `/admin/fulfillment` queue for a person to confirm address and shipping. Until Telegram/Discord credentials are configured, mentorship access stays in a staff queue.
- Optional Telegram: configure `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`; the bot must be an admin allowed to create invite links. Join requests are restricted for manual approval. Optional Discord: configure a bot with Create Invite permission and `DISCORD_CHANNEL_ID`. Do not paste bot secrets into chat or source control.

## Analytics, domain and operations

- The consent banner loads Vercel Web Analytics only after opt-in. Enable Web Analytics in the Vercel project before expecting data. Consent rejection keeps the analytics script unloaded.
- Add `NEXT_PUBLIC_SITE_URL` as the verified production canonical origin, then update Supabase redirect allowlists, Stripe return URLs, email links and Vercel domain settings consistently. `trade-with-joreem.vercel.app` is the development/default canonical for now. The custom domain and `app.tradewithjoreem.com` are not considered live until Vercel DNS verification succeeds; do not replace existing Cloudflare DNS records without confirming the exact target records and any email/domain services they support.
- Valinor security monitoring is not wired yet because the project needs its documented authenticated endpoint, event schema and approved data scope. Do not send customer information to an unverified host.
- Signup and contact abuse protection still needs provider/edge rate limits enabled; an in-memory function limiter is not reliable on serverless. Monitor Stripe webhook failures and the admin queues.

## Security and launch gates

See [`SECURITY.md`](./SECURITY.md). Private routes verify Supabase sessions server-side; admin queues require `profiles.is_admin`; user records are owner-scoped by RLS; payment fulfilment depends on signature-verified Stripe webhooks. Before production, configure environment secrets, email/redirects, private files, exact Stripe products/shipping/tax/refund terms, rate limits, custom domain DNS, and run test-mode end-to-end purchases. Do not accept real payments until fulfillment is staffed and legally reviewed.
