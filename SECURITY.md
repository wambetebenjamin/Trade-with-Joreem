# Security baseline and production gates

This repository is currently a mostly static marketing site. Security controls that depend on a database, real accounts, administrator privileges, or payment processing cannot be enforced by browser JavaScript. Do not treat the member demo as authentication or put private member/admin data in static files.

## Implemented in this repository

- Contact-provider credentials are read only from server environment variables (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CONTACT_EMAIL`); never place these values in HTML or browser JavaScript.
- The contact endpoint accepts same-origin HTTPS JSON POSTs only, rejects oversized or unexpected payloads, limits field lengths, rejects malformed input, and includes a honeypot. These checks reduce abuse but **are not a substitute for a persistent rate limiter**.
- Baseline response headers are configured in `vercel.json`: MIME sniffing protection, frame denial, a restrictive frame-ancestors directive, referrer policy, restricted browser permissions, and HSTS.
- The login demo no longer grants a fake browser-side session or stores submitted credentials. Member sign-in remains unavailable until backed by a real authentication service.

## Required before accounts, admin, or private records go live

- Keep all privileged keys server-side; scope and rotate credentials, and use separate least-privilege keys for preview and production.
- Use a real authentication provider with secure session cookies, MFA for administrators, recovery protections, and server-side role checks. Do not rely on hidden buttons, local storage, or client redirects for access control.
- For every database table containing user data, enable row-level security and add policies that enforce `auth.uid() = owner_id` (or the equivalent trusted identity). Also check record ownership in every server endpoint; never trust an `owner_id` supplied by the browser. Test cross-account reads, writes, updates, and deletes.
- Put admin routes and data behind server-enforced authentication and an explicit admin role. Deny by default and log privileged actions without logging secrets or unnecessary personal data.
- Apply signup and login abuse controls at the server/edge: per-IP and per-account throttles, email verification, bot protection where appropriate, and alerting for credential stuffing. Avoid keeping rate limits only in process memory on serverless functions.
- Verify every webhook signature using the provider's documented signing secret, compare timestamps, reject stale/replayed events with idempotency handling, and never act on unverified payloads.
- Add automated dependency, secret, and static security checks to CI; review alerts and maintain an incident/credential rotation procedure.

## Valinor monitoring integration

`valinor.sbs` has been named as the security-monitoring service, but this repository does not yet have an API endpoint, SDK, event schema, authentication method, privacy/security documentation, or configured credentials for that service. Do not transmit visitor data, contact form contents, IP addresses, or secrets to it until those details are verified and an approved, minimal event integration is configured server-side. Monitoring must not block core site behavior if the provider is unavailable.

## Current limitations

There is no production database/RLS policy, real signup/authentication system, administrator backend, payment processor integration, webhook receiver, or persistent rate-limit store in this repository. The public static member page cannot be made private by a client-side redirect. Keep it free of confidential data until those services exist and are tested.
