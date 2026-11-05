# Security posture and launch checklist

## Implemented in the Next.js application

- Supabase SSR sessions are verified server-side for dashboard, curriculum, downloads and admin routes. Browser local storage is used only for a non-sensitive cart, never for identity or entitlements.
- `supabase/migrations/202611050001_core_schema.sql` enables row-level security. Orders, entitlements, journals, fulfillment requests and community invites are owner-scoped. Journal inserts derive the owner from the verified session. Payment, entitlement, webhook and fulfillment writes are server-only.
- Admin routes check the authenticated user's `profiles.is_admin` server-side. Authenticated users can update `display_name` only; they cannot change the admin flag. Service-role access is isolated to server modules and guarded by `server-only`.
- Checkout SKUs and Stripe Price IDs are allow-listed server-side. A buyer must have a verified Supabase session. Stripe webhook signatures are verified against the raw request body; event IDs are recorded for idempotency. Access is granted only from a verified provider event, never a success-page query.
- Digital delivery uses private Supabase Storage, checks a paid order or active Pro/Elite entitlement, then issues short-lived signed URLs. Sample PDFs are not sale-ready.
- Print purchases, membership purchases, digital downloads and START20 fail closed until delivery readiness, shipping, files, email and coupon settings are configured.
- Contact and journal endpoints validate same-origin requests, bound request sizes and fields, and keep provider secrets server-side. Baseline security headers are configured in `vercel.json`.

## Required before production

1. Create and apply the migration in a dedicated Supabase project. Configure email verification/magic-link delivery, redirect allowlists, signup/email rate limits and bot protection. Add persistent edge/provider rate limits for contact and auth routes; in-memory serverless limits are not sufficient.
2. Store secrets only in Vercel/server runtime. Keep the Supabase service-role key, Stripe secret, Stripe webhook secret, Resend key and bot tokens out of `NEXT_PUBLIC_*`, source control and browser responses. Rotate any exposed value.
3. Configure Stripe test products, fixed shipping rate, the one-time START20 coupon and signed webhook. Test duplicate delivery, asynchronous payments, subscription cancellation, cross-user download denial, missing files, invalid signatures and unsupported SKUs before live mode.
4. Upload the final licensed PDFs to the private Storage bucket and set `books.asset_ready=true` only after checking the full file and access path. Existing repository PDFs are sample chapters, not complete paid books.
5. Set `MEMBERSHIP_DELIVERY_ENABLED=true` only after curriculum, support, payment/refund terms and community provisioning are operational. Set `PRINT_FULFILLMENT_ENABLED=true` only after staff and shipping are ready. Until then checkout intentionally returns 503 instead of accepting money without fulfillment.
6. Assign the initial admin flag through a trusted, audited SQL/service-role process after verifying the account. Never expose self-promotion or an unauthenticated admin-create route.
7. Review privacy, consumer, subscription and tax obligations with qualified advisers. Enable Stripe Tax only after the account/jurisdiction setup. Monitor webhook, auth, email and fulfillment failures.

## Valinor monitoring

`valinor.sbs` is not integrated. A domain alone is not an integration specification. Verify the service owner, authenticated API/SDK endpoint, signature method, event schema, retention and privacy terms, and approve a minimal event scope before connecting it. Do not send contact contents, passwords, tokens, payment data or unnecessary personal information. Core site operation should not depend on monitoring availability.

## Current configuration gaps

No dedicated Trade with Joreem Supabase project, Stripe credentials/Price IDs, verified Resend sender, final private book PDFs, community bot credentials or Vercel Analytics enablement has been configured in this repository. The app builds, but no test/live charge or end-to-end delivery has been verified. Provider signup limits, edge rate limits, domain DNS and legal approvals remain deployment gates. Static legacy HTML remains only as a copy/reference archive; never place confidential data in it.
