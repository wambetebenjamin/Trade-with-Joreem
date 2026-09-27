# Trade with Joreem — Website

A fast, dark "trading-terminal" themed marketing + commerce site for the Joreem
forex/crypto/stocks mentorship brand. Built on the Startup HTML template engine
(Bootstrap 5, jQuery, Owl Carousel, WOW, CounterUp) with every template brand
element removed and the whole experience reskinned for trading.

## Pages (all share the FundingPips-inspired structure layer)

Every page carries the promo bar, the unified navbar (Home / How It Works /
Pricing / Bookstore / Mentorship / About / Contact), a centered page hero with
kicker chip + stat chips, and the same dark-gold trading theme
(`css/funding.css`). Shared interactivity (promo bar, animated counters, plan
configurator, cart, checkout) lives in `js/trading.js`; index-only widgets
(equity sparkline, Discord feed) live in `js/home.js`.

| File             | Purpose                                                              |
|------------------|----------------------------------------------------------------------|
| `index.html`     | Homepage rebuilt on the FundingPips-style structure (see below)       |
| `about.html`     | Story, stat band, 3-pillar stage cards, horizontal journey timeline   |
| `bookstore.html` | Value band, catalog, bundle as FundingPips price card, delivery chips |
| `mentorship.html`| Plan configurator (tabs + monthly/annual) + plan comparison table, FP feature cards, 4-step getting-started grid |
| `login.html`     | Two-panel auth: brand panel with stats & quote + login form           |
| `member.html`    | Member dashboard: stat band, breakdowns, curriculum, signal log, community invites |
| `contact.html`   | Value-chip contact info, stat chips, contact form                     |
| `terms.html`     | Terms of Service (document text unchanged)                            |
| `privacy.html`   | Privacy Policy (document text unchanged)                              |
| `risk.html`      | Full Financial & Risk Disclaimer (document text unchanged)             |

## Homepage structure (mirrors fundingpips.com, reskinned for Joreem)

Top to bottom, each section maps 1:1 to FundingPips' homepage architecture:

1. **Promo bar** – dismissible 20%-off announcement (`START20` code, click to copy)
2. **Centered hero** – big headline, inline stat chips (countries / students / breakdowns), dual CTAs, rating chips
3. **Live terminal stage** – the EUR/USD candlestick terminal floating over the hero, then the market ticker
4. **Value band** – "Learn with peace of mind" + four value chips
5. **Student wins widget** – browser-chrome app panel with a wins log table + total counter (the "rewards widget" pattern)
6. **How it works** – three numbered step cards, each with a mini visual and a review quote
7. **Pricing configurator** – plan tabs (Foundation / Pro / Elite) + monthly/annual toggle feeding a single spec-card (the "Buy Challenge" pattern), wired to `data-plan-checkout`
8. **ONE SYSTEM banner** – the "1 Step Flex" highlight-band pattern
9. **Student journey** – horizontal case-study timeline with milestone nodes and ROI stats
10. **Testimonials** – "Real students, real results, real impact" carousel
11. **Learn on your terms** – feature cards, asset chips, animated platform orbit, session chips
12. **Stages** – "Your discipline is our system" three-stage path
13. **Shows** – "Built by traders, for traders" cards (Live Desk / Psychology / Beyond the Charts)
14. **Community** – live fake-Discord widget with channel sidebar and rotating win-log bot feed
15. **The Library** – featured book cards (cart-enabled)
16. **Global band** – mentor story + "Building traders globally since 2018" stats
17. **FAQ, risk disclaimer, footer** – unchanged Joreem documents and links

New files: `css/funding.css` (structure layer) and `js/home.js` (index-only
widgets). `js/trading.js` carries the shared promo bar, counters and pricing
configurator, plus monthly/annual plan variants (`foundation-a`, `pro-m`,
`elite-m`) and a fix so plan checkout actually carries the selected plan into
the modal.

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
