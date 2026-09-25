# SEO & Growth Playbook — Trade with Joreem

Written for the funded-accounts launch (programs, rules, payouts, blog) alongside
the existing mentorship and bookstore. Everything below is either **already
implemented in this repo** (marked ✅) or a task for launch week (marked ⬜).

---

## 1. Positioning that search engines can understand

One sentence, repeated consistently across the site, ads and profiles:

> **Trade with Joreem teaches risk-first trading in Forex, Crypto and Stocks — and
> funds the traders who prove they can do it, with evaluations from $39, up to
> $400K in simulated allocation and profit splits up to 95%.**

Search engines reward topical clusters. The site now has three clean clusters that
link to each other:

| Cluster | Money pages | Supporting content |
|---|---|---|
| Get funded | `funding.html`, `challenge-rules.html`, `payouts.html` | `blog/pass-prop-firm-challenge-checklist.html`, `blog/1-step-vs-2-step-challenge.html` |
| Learn to trade | `mentorship.html`, `bookstore.html`, `about.html` | `blog/position-sizing-risk-management.html` |
| Local / trust | `contact.html`, `affiliates.html`, `risk.html`, `terms.html`, `privacy.html` | `blog/funded-trading-accounts-kenya-nigeria.html` |

---

## 2. Keyword map

Intent legend: **BOFU** = buy now, **MOFU** = comparing, **TOFU** = learning.

| Page | Primary keyword | Secondary keywords | Intent | Locale |
|---|---|---|---|---|
| `index.html` | trading mentorship | forex mentorship, learn forex Kenya, trading course | MOFU | Global + KE/NG |
| `funding.html` | funded trading account | prop firm Kenya, prop firm Nigeria, get funded trader, funded account Ethiopia | BOFU | KE, NG, ET, SO |
| `funding.html` (Flex tab) | 1 step flex challenge | one step prop firm, pass in one day funded account | BOFU | Global |
| `funding.html` (Zero tab) | instant funding prop firm | zero challenge funded account, no evaluation funding | BOFU | Global |
| `challenge-rules.html` | prop firm rules | static drawdown rules, daily loss limit prop firm, consistency rule | MOFU | Global |
| `payouts.html` | prop firm payout proof | profit split prop firm, M-Pesa prop firm payout, funded account withdrawal | MOFU/BOFU | KE, NG |
| `affiliates.html` | prop firm affiliate program | forex IB program Kenya, trading affiliate commission | BOFU | KE, NG |
| `mentorship.html` | forex mentorship program | 1-on-1 trading mentor, trading mentorship Africa | BOFU | Global |
| `bookstore.html` | forex trading books | trading psychology book, crypto trading book PDF | BOFU | Global |
| `blog/pass-prop-firm-challenge-checklist.html` | how to pass a prop firm challenge | prop firm challenge tips, funded account rules checklist | TOFU/MOFU | Global |
| `blog/1-step-vs-2-step-challenge.html` | 1 step vs 2 step challenge | which prop firm challenge is easier | MOFU | Global |
| `blog/funded-trading-accounts-kenya-nigeria.html` | funded trading account Kenya | prop firm Nigeria, M-Pesa prop firm, funded account Ethiopia/Somalia | BOFU | KE, NG, ET, SO |
| `blog/position-sizing-risk-management.html` | position sizing formula | how to risk 1% per trade, forex lot size calculator | TOFU | Global |

Rule of thumb: one primary keyword per URL. Never point two pages at the same
primary — that is how sites cannibalise their own rankings.

---

## 3. On-page SEO — what is already done ✅

Every page in this repo now ships with:

- **Unique `<title>`** ≤ 60 characters where practical, primary keyword first,
  brand last (`| Trade with Joreem`).
- **Unique meta description** 140–160 characters, written as ad copy with a
  benefit and a number, not a keyword list.
- **One `<h1>` per page** containing the primary keyword, with a strict
  `h2 → h3` hierarchy below it.
- **Keyword-consistent URL slugs** (`challenge-rules.html`, `payouts.html`,
  `blog/1-step-vs-2-step-challenge.html`) — descriptive, hyphenated, no IDs.
- **Canonical tag** on every page pointing at `https://tradewithjoreem.com/...`.
- **Open Graph + Twitter card** tags with a 1200×630 social image
  (`img/og-default.jpg`).
- **Structured data (JSON-LD)** — validated, no errors:

| Schema type | Where | Why it matters |
|---|---|---|
| `Organization`, `WebSite` | every page | brand knowledge panel, sitelinks search box |
| `BreadcrumbList` | all pages | breadcrumb rich results |
| `ItemList` + `Product`/`Offer` | `funding.html` | price visibility for the offer list |
| `FAQPage` | `funding.html`, `challenge-rules.html`, `payouts.html`, 4 articles | FAQ rich results |
| `BlogPosting` + `Blog` | `blog.html` + articles | article rich results, freshness signals |
| `ContactPage`, `AboutPage` | `contact.html`, `about.html` | entity clarity |

- **Internal linking**: every money page links to the rules, payouts and pricing
  pages; articles link up to `funding.html#pricing` (a "money page" link) and
  sideways to sibling articles. Footer carries 11 sitewide links.
- **Image hygiene**: `alt` on content images, `loading="lazy"` below the fold,
  `width`/`height` on the hero to prevent layout shift.
- **Mobile**: Bootstrap 5 grid, 44px+ tap targets, no horizontal scroll,
  responsive pricing table wrappers.

---

## 4. Technical SEO — do this at launch ⬜

1. **Pick the real domain and 301 the rest.** The repo assumes
   `https://tradewithjoreem.com`. If you launch on a different host, update:
   `robots.txt`, `sitemap.xml`, every `<link rel="canonical">`, every `og:url`
   and `og:image` URL, every JSON-LD `@id`/`url`. A find-and-replace across the
   `.html` files is enough — search for `tradewithjoreem.com`.
2. **HTTPS + www decision.** Choose one (`https://tradewithjoreem.com` is used
   here, no `www`) and 301 the other. Mixed versions split link equity.
3. **Submit the sitemap** in Google Search Console and Bing Webmaster Tools;
   request indexing for `funding.html` and the four articles first.
4. **Page speed.** Current stack is light (Bootstrap + jQuery from CDN, local
   libs). For the last few points: convert `img/hero.jpg`, `img/funding-hero.jpg`
   and `img/og-default.jpg` to WebP/AVIF, keep them ≤ 200 KB, and add
   `<link rel="preload" as="image" href="img/funding-hero.jpg">` on
   `funding.html`. Target LCP < 2.5 s on a 3G Moto G — that is the device profile
   most of your East African traffic will arrive on.
5. **Faceted-URL hygiene.** The pricing configurator uses query parameters
   (`?program=flex&size=50K&cur=KES`). Those are already disallowed in
   `robots.txt` to protect crawl budget, and the canonical tag always points at
   the clean URL.
6. **404s and redirects.** Add a custom `404.html` before launch; redirect any
   legacy URLs (for example an old `/plans` page) with 301s.
7. **Analytics + consent.** Install GA4 and set up the events in section 8. If
   you serve EU traffic, a cookie banner is required before GA4 fires.

---

## 5. Local SEO — Kenya, Nigeria, Ethiopia, Somalia

The paid traffic that brought you here targets `kenya_nigeria_ethiopia_somalia`,
so mirror that in organic search:

- ⬜ **Google Business Profile** as a service-area business (Nairobi base,
  online service). Categories: *Financial consultant*, *Trading company*,
  *Educational consultant*. Post weekly (a reward proof, a blog link, a rules
  tip).
- ⬜ **NAP consistency** — the same business name, email and country line
  ("Trade with Joreem — Nairobi, Kenya · 100% online") on the site footer,
  LinkedIn, X, Telegram bio, YouTube About and any directory listing.
- ⬜ **Local citations**: Kenyan and Nigerian business directories, tech/trading
  hubs, YouTube channel metadata with "Nairobi", "Lagos" in descriptions.
- ⬜ **Language strategy**: keep English as the canonical language; Swahili and
  Amharic landing pages (`/sw/`, `/am/`) are a v2 project. Add `hreflang` only
  when those pages genuinely exist — fake hreflang hurts more than it helps.
- ⬜ **Reputation signals**: ask funded, paid-out traders for Google reviews and
  Trustpilot reviews tied to the brand name. Review count is a ranking factor for
  "[brand] + scam/legit" queries, which is where most prop-firm buyers go first.

---

## 6. Content calendar (next 12 weeks)

One article a fortnight, each 900–1,400 words, each linking to `funding.html#pricing`,
`challenge-rules.html` and one sibling article.

| Week | Working title | Target keyword | Type |
|---|---|---|---|
| 1 | Challenge fee vs account size: the maths | how much does a prop firm challenge cost | MOFU |
| 3 | Drawdown rules explained with real numbers | trailing vs static drawdown | MOFU |
| 5 | Best time of day to trade a challenge from East Africa | forex market hours Kenya | TOFU |
| 7 | Consistency rules: how to stay under 40% | prop firm consistency rule | MOFU |
| 9 | Reward request walkthrough (with a real receipt format) | prop firm withdrawal process | BOFU |
| 11 | Trading journal template for funded accounts | free trading journal template | TOFU |

Reuse plan: each article becomes a Telegram post, a 45-second vertical video,
three carousel slides and an email in the Monday Market Notes newsletter. One
piece of research, five distribution channels.

---

## 7. Off-page: links, community and PR

- ⬜ **Community-first links**: answer questions in r/Forex, r/Daytrading,
  r/propfirms, Kenyan/Nigerian investor groups and Quora — link only where the
  article genuinely answers the question (rules pages and the checklist article
  are the ones people actually want).
- ⬜ **Data as linkbait**: publish an original "East African Prop Firm Payout
  Report" from your own anonymised payout data (counts, median reward, median
  days-to-payout, payout method split). Original data earns links from finance
  blogs and YouTubers.
- ⬜ **Creator partnerships**: swap commissions for coverage with 10–20 mid-size
  African trading YouTubers/TikTokers via `affiliates.html`. Ask for a link in
  the description, not just a demo sale.
- ⬜ **Guests posts** on Kenyan/Nigerian fintech and personal-finance blogs with
  a bio link to `funding.html`.
- ⬜ **Wikipedia/Wikidata**: create a Wikidata item for the brand (name, URL,
  country, industry). It is a small but durable entity signal.
- ⬜ **Unlinked mentions**: set Google Alerts for "Trade with Joreem" and
  "Joreem trading" and convert mentions into links.

---

## 8. Measurement

**GA4 events to fire** (names matter — keep them stable):

| Event | Trigger | Value |
|---|---|---|
| `view_pricing` | configurator scrolled into view | — |
| `select_program` | program tab clicked | program id |
| `select_size` | account size clicked | size label |
| `select_currency` | currency clicked | currency code |
| `apply_promo` | promo code accepted | code |
| `begin_checkout` | cart drawer "Secure Checkout" | cart value |
| `add_payment_info` | payment tab selected | method |
| `purchase` | checkout success screen | total, currency, items |
| `affiliate_apply` | partner form submitted | tier |
| `blog_read_75` | 75% scroll on an article | article slug |

**KPIs to review monthly** (Search Console + GA4):

- Non-brand organic sessions to `/funding.html` and `/payouts.html`
- Position for the 13 primary keywords in section 2
- Organic → `begin_checkout` conversion rate (benchmark: 1.5–3% for this niche)
- Cost per purchase from paid social, and the organic/paid overlap on branded search
- Number of indexed pages with valid rich results (Rich Results Test / GSC Enhancements)

---

## 9. Paid social tie-in (Meta / TikTok)

Your live campaign URL already carries a sensible UTM pattern:

```
?utm_source=meta&utm_medium=paid_social&utm_campaign=2026_q3_localized_2step_flex_broad
&utm_content=img_levitate_2step_flex
&utm_term=kenya_nigeria_ethiopia_somalia_2step_flex_broad_pack_1
&utm_id={{campaign_id}}&audience=new_audience
```

Keep that structure and add these rules:

1. **Send paid traffic to the page matching the offer**, never the homepage:
   Flex creatives → `funding.html?program=flex&utm_...`,
   2 Step creatives → `funding.html?program=two-step&utm_...`,
   payout-proof creatives → `payouts.html?utm_...`.
2. **Localise by ad set**: `?cur=KES` for Kenya, `?cur=NGN` for Nigeria,
   `?cur=ETB` for Ethiopia. The configurator reads the parameter and re-prices
   the page instantly, which measurably lifts conversion on localised traffic.
3. **Carry a promo code** in the creative and the URL (`&code=JOREEM20`) so the
   discount is applied on arrival and you can attribute it.
4. **Compliance rules that get accounts banned if ignored**: no profit claims, no
   "guaranteed funded", no screenshots implying a salary, and always disclose
   that accounts are simulated. Keep the risk disclaimer line in the ad copy —
   Meta's financial-services policy requires it for this category.
5. **Creative-to-page match**: the ad headline should appear verbatim in the page
   `<h1>` or hero subhead. Meta's relevance score and Google's landing-page
   experience both reward it.

---

## 10. Launch checklist (copy into your project tool)

- [ ] Replace `tradewithjoreem.com` with the real domain everywhere
- [ ] Submit `sitemap.xml` to Google + Bing
- [ ] Verify Rich Results Test passes on funding, rules, payouts, blog and articles
- [ ] Install GA4 + the events in section 8; verify in DebugView
- [ ] Add custom `404.html`
- [ ] Compress and convert hero/OG images; add hero preload
- [ ] Google Business Profile + NAP consistency sweep
- [ ] Connect the live payouts feed (see README) so the payout wall is real data
- [ ] Replace illustrative stats with verified figures before any paid spend
- [ ] Legal review of the funded-account terms for your operating jurisdiction
