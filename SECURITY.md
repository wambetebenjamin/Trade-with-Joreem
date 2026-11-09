# Security and data handling

- Google Sheets + Apps Script is the configured records backend; there is no SQL database, ORM, local file database or Supabase connection.
- The public Apps Script endpoint accepts writes to the allowlisted form tabs. Anyone with its URL can submit; it is not a private API. `doGet` must return only intentionally public tabs such as `Books` and `PublicContent`.
- Restrict Google Sheet editors, limit collected data, monitor Apps Script quotas and add abuse controls before broad public use. Do not store passwords, payment card data, account credentials or sensitive trading journals in public form submissions.
- Stripe secret keys and webhook secrets stay server-side. The Next.js Stripe webhook verifies Stripe's signature, then sends only verified event rows to Apps Script using `GOOGLE_SCRIPT_WEBHOOK_SECRET`; Apps Script stores the matching secret in Script Property `TWJ_STRIPE_WEBHOOK_SECRET`.
- The browser-visible Apps Script URL is not a secret. Never put `GOOGLE_SCRIPT_WEBHOOK_SECRET`, `TWJ_AUTOMATION_TOKEN`, Stripe keys or admin credentials in browser code or `NEXT_PUBLIC_*` variables.
- Google Sheets does not provide user authentication or row-level authorization. Member dashboard, downloads, order history, account changes and admin queues remain unavailable until a dedicated secure access mechanism is implemented.
- Checkout is gated by membership, digital delivery and print fulfilment environment flags. Keep `ALLOW_LIVE_PAYMENTS=false` until all providers, legal terms, final files and fulfilment operations are tested.
- Configure Render secrets as environment variables; do not commit `.env.local` or provider keys.
- `valinor.sbs` is not integrated. Do not send visitor/security information there without its documented endpoint, authentication, schema and an approved data scope.
