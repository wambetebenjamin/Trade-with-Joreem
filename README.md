# Trade with Joreem — Website

A fast, dark "trading-terminal" themed marketing + commerce site for the Joreem
forex/crypto/stocks mentorship brand. Built on the Startup HTML template engine
(Bootstrap 5, jQuery, Owl Carousel, WOW, CounterUp) with every template brand
element removed and the whole experience reskinned for trading.

## Pages

| File             | Purpose                                                              |
|------------------|----------------------------------------------------------------------|
| `index.html`     | Hero with live candlestick terminal, market ticker, books, plans, testimonials, FAQ, risk disclaimer |
| `about.html`     | Joreem's story, the 3-pillar method, journey timeline                |
| `bookstore.html` | Print + digital book catalog, bundle deal, shipping/payment info     |
| `mentorship.html`| Program details, tiered pricing (monthly / annual / elite), how-it-works, FAQ |
| `login.html`     | Member login (demo auth)                                             |
| `member.html`    | Member dashboard: breakdowns, curriculum progress, signal log, resources, Telegram/Discord invites |
| `contact.html`   | Contact form + support details                                       |
| `terms.html`     | Terms of Service                                                     |
| `privacy.html`   | Privacy Policy                                                       |
| `risk.html`      | Full Financial & Risk Disclaimer (linked from every footer)          |

## Run locally

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

## Demo credentials

- **Member login:** `demo@tradewithjoreem.com` / `demo123`
  (any valid email + 6-char password also signs in — this is a front-end demo)
- **Cart / checkout:** fully interactive in the browser. Digital books return
  real (sample) PDF downloads; mentorship checkout issues the Telegram/Discord
  invite screen and unlocks the dashboard.

## Production wiring (where the real services plug in)

The checkout is a front-end simulation today. To go live:

1. **Stripe (cards):** add the Payment Element using your publishable key in
   the `payPanelCard` section of the checkout modal (`js/trading.js` →
   `initCheckout` handles the flow).
2. **PayPal:** drop in the PayPal JS SDK button in `payPanelPaypal`.
3. **Mobile money (Flutterwave):** call `FlutterwaveCheckout` in `payPanelMomo`
   (M-Pesa, Airtel Money, MTN MoMo).
4. **Pesapal:** form-post redirect from `payPanelPesapal`.
5. On `coGoStep(3)` success: provision the membership server-side, then the
   existing success screen already surfaces the **private Telegram/Discord
   invite** and links to `member.html`.

Membership auth (`js/trading.js` → `initAuth`) stores a session flag in
`localStorage`; replace with real JWT/session validation before launch.

## Brand assets

- `img/joreem.jpg` — Joreem's headshot (provided)
- `img/hero.jpg` — real photo, [Unsplash](https://images.unsplash.com/photo-1689732888407-310424e3a372) (Unsplash License: free for commercial use, no attribution required)
- `img/about.jpg` — real photo, [Pexels](https://pexels.com/photo/7567432) (Pexels License: free for commercial use, no attribution required)
- `assets/books/*.jpg` — designed book covers; `*.pdf` — sample digital downloads
- `img/favicon.svg` — gold candlestick mark

## Files that were deliberately NOT carried over from the template

Template branding and credits (author attribution, "Buy Pro Version" links,
"Startup" logo, `README.txt`, `LICENSE.txt` preview, demo team/testimonial/vendor
photos, placeholder contact details) were all removed per brand requirements.
Only the framework libraries (`lib/`) and the Bootstrap stylesheet were reused.
