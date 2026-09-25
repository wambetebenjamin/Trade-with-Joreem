# Trade with Joreem — Website

A fast, dark "trading-terminal" themed marketing + commerce site for the Joreem
forex/crypto/stocks brand: **mentorship, books and funded-account evaluations**.
Built on the Startup HTML template engine (Bootstrap 5, jQuery, Owl Carousel,
WOW, CounterUp) with every template brand element removed and the whole
experience reskinned for trading.

## Pages

### Education & commerce

| File             | Purpose                                                              |
|------------------|----------------------------------------------------------------------|
| `index.html`     | Hero with live candlestick terminal, market ticker, funded-account teaser, books, plans, testimonials, FAQ, risk disclaimer |
| `about.html`     | Joreem's story, the 3-pillar method, journey timeline                |
| `bookstore.html` | Print + digital book catalog, bundle deal, shipping/payment info     |
| `mentorship.html`| Program details, tiered pricing (monthly / annual / elite), how-it-works, FAQ |
| `login.html`     | Member login (demo auth)                                             |
| `member.html`    | Member dashboard: breakdowns, curriculum progress, signal log, resources, Telegram/Discord invites |
| `contact.html`   | Contact form + support details                                       |

### Funded accounts (evaluation / prop-style program)

| File                  | Purpose                                                          |
|-----------------------|------------------------------------------------------------------|
| `funding.html`        | Program hub: hero, stat strip, value props, live pricing configurator (program × size × currency × add-ons × promo), all-sizes listing, Flex spotlight, 3-stage "how it works", trader journey, trading conditions, reward calculator, rewards feed, rules summary, testimonials, FAQ |
| `challenge-rules.html`| Full rulebook: specifications, cash profit targets, static drawdown, daily loss, consistency, allowances, prohibited practices, reward conditions, KYC, breach handling |
| `payouts.html`        | Splits, reward cycles, payment methods & times, request walkthrough, payout wall, scaling plan, tax/compliance, FAQ |
| `affiliates.html`     | Partner program: tiered commission (20/25/30%), recurring IB share, dashboard preview, application form |

### Content & SEO

| File                  | Purpose                                                          |
|-----------------------|------------------------------------------------------------------|
| `blog.html`           | Blog hub with featured post, category filter and newsletter capture |
| `blog/pass-prop-firm-challenge-checklist.html` | 10-point checklist for passing an evaluation |
| `blog/1-step-vs-2-step-challenge.html`         | Program comparison + decision rule          |
| `blog/funded-trading-accounts-kenya-nigeria.html` | Local guide: KSh/₦ costs, M-Pesa payouts, KYC, tax |
| `blog/position-sizing-risk-management.html`    | Position sizing formula with worked examples |
| `robots.txt`          | Crawl rules (blocks member/login + PDFs, sitemap pointer)         |
| `sitemap.xml`         | All indexable URLs with priorities and image entries              |
| `site.webmanifest`    | PWA manifest with app shortcuts to pricing/rules/payouts/blog     |
| `SEO.md`              | Full SEO & growth playbook (keyword map, schema inventory, content calendar, paid-social tie-in, KPIs) |

### Legal

| File             | Purpose                                                              |
|------------------|----------------------------------------------------------------------|
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
  invite screen and unlocks the dashboard. Funded-account SKUs are priced live by
  the configurator and flow through the same cart.

## Funded-accounts engine

All pricing lives in one place: `js/funding.js` → `PROGRAMS`, `SIZES`, `CURRENCIES`,
`ADDONS`, `PROMOS`. Change a number there and the configurator, the all-sizes
listing grid, the sticky buy bar and the cart line all follow.

- **Deep links** — `funding.html?program=flex&size=50K&cur=KES&code=JOREEM20`
  Pre-selects program, size, display currency and promo code (used by paid ads
  and affiliate links).
- **Cart bridge** — challenge SKUs are registered at click time through
  `window.TWJ.addItem()` (defined in `js/trading.js`), so dynamic prices still
  ride the existing cart + checkout flow. Digital items skip shipping.
- **Currency** — display-only conversion (USD settlement), with the note shown
  under the price card. Update the rates in `CURRENCIES` with your ops numbers.
- **Add-ons & promos** — swap-free add-on (+10%) and promo codes
  `JOREEM20` / `HELLO` (20%) and `FLEX10` (10%).
- **Reward calculator** — converts account size + monthly % + split into the net
  payout. Pure front-end maths, no dependency.

### Live rewards feed (before you go live)

`js/funding.js` renders the homepage feed and the `payouts.html` payout wall from
`REWARD_SEED` and `LEDGER` — **illustrative sample data**. Replace them with your
real payout data by one of these routes:

1. **Server-side render**: fetch `/api/payouts?limit=12` and inject the rows, or
2. **Static regeneration**: export the rows from your admin panel into a
   `payouts.json` and swap the constants for a `fetch()`.

The simulated "new reward every few seconds" interval at the bottom of `initFeed()`
should be deleted once real data is connected.

## Production wiring (where the real services plug in)

The checkout is a front-end simulation today. To go live:

1. **Stripe (cards):** add the Payment Element using your publishable key in
   the `payPanelCard` section of the checkout modal (`js/trading.js` →
   `initCheckout` handles the flow).
2. **PayPal:** drop in the PayPal JS SDK button in `payPanelPaypal`.
3. **Mobile money (Flutterwave):** call `FlutterwaveCheckout` in `payPanelMomo`
   (M-Pesa, Airtel Money, MTN MoMo).
4. **Pesapal:** form-post redirect from `payPanelPesapal`.
5. On `coGoStep(3)` success: provision the membership / trading credentials
   server-side, then the existing success screen already surfaces the
   **private Telegram/Discord invite** and links to `member.html`.
6. **Payout rail**: connect the reward-request webhook to Flutterwave/Pesapal
   transfer APIs so `payouts.html` timings stay truthful.

Membership auth (`js/trading.js` → `initAuth`) stores a session flag in
`localStorage`; replace with real JWT/session validation before launch.

## Replace-before-launch checklist

These are placeholders that must be swapped for verified figures. Advertising
rules (Meta, Google, most jurisdictions) treat unverifiable performance claims as
misleading, so do this before spending on ads:

- [ ] Domain: replace `tradewithjoreem.com` in `robots.txt`, `sitemap.xml`,
      canonical/OG tags and JSON-LD blocks.
- [ ] Brand metrics: review counts and ratings (`4.9/5 from 600+ members`,
      `2,500+ students`) — keep only what you can evidence.
- [ ] Payout feed + payout wall sample rows (`js/funding.js`).
- [ ] Trader journey / reward receipt case study on `funding.html` — currently
      labelled illustrative; replace with a real, consented, verifiable case.
- [ ] Program economics in `js/funding.js` (`PROGRAMS`, `SIZES`) — prices,
      targets, drawdown, splits, cycles — must match your published terms.
- [ ] Partner metrics on `affiliates.html` (tiers, cookie window, payout date).
- [ ] Statistics on `payouts.html` (processing times, method list).
- [ ] Every funded-account page keeps the "simulated environment" disclosure and
      a visible link to `risk.html`. Do not remove them.

## Brand assets

- `img/joreem.jpg` — Joreem's headshot (provided)
- `img/hero.jpg` — real photo, [Unsplash](https://images.unsplash.com/photo-1689732888407-310424e3a372) (Unsplash License: free for commercial use, no attribution required)
- `img/about.jpg` — real photo, [Pexels](https://pexels.com/photo/7567432) (Pexels License: free for commercial use, no attribution required)
- `img/funding-hero.jpg`, `img/challenge-card.jpg`, `img/og-default.jpg` — AI-generated brand art for the funded-accounts launch and social sharing
- `assets/books/*.jpg` — designed book covers; `*.pdf` — sample digital downloads
- `img/favicon.svg` — gold candlestick mark

## Files that were deliberately NOT carried over from the template

Template branding and credits (author attribution, "Buy Pro Version" links,
"Startup" logo, `README.txt`, `LICENSE.txt` preview, demo team/testimonial/vendor
photos, placeholder contact details) were all removed per brand requirements.
Only the framework libraries (`lib/`) and the Bootstrap stylesheet were reused.

## Note on the funded-accounts pages

The layout patterns (pricing configurator, program comparison, payout wall,
three-stage explainer, community feed) are deliberately modelled on how leading
prop firms present their offers — that structure is what buyers expect and it is
how the industry communicates rules. All **copy, code and design here is
original** to Trade with Joreem, and the numbers match the terms published on
this site, not another firm's. Do not paste text or lift imagery from any other
prop firm; it creates trademark and copyright exposure and it is unnecessary.
