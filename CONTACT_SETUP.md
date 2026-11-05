# Contact email setup

The production contact form uses the Next.js route `app/api/contact/route.ts` and Resend. Configure these values in `.env.local` for development and as server-side Production/Preview environment variables in Vercel:

- `RESEND_API_KEY`: server-only Resend API key.
- `RESEND_FROM_EMAIL`: sender on a domain verified in Resend.
- `CONTACT_EMAIL`: recipient inbox, currently `hello@tradewithjoreem.com`.

The form validates fields, checks same-origin requests, enforces input bounds and includes a honeypot. If Resend is missing or returns an error, the visitor sees an error and the form does not claim that the message was sent. Configure persistent rate limiting/edge abuse controls before public launch; a honeypot is not a rate limiter.
