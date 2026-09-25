/********** Trade with Joreem — Funded Accounts Engine **********/
/* Powers funding.html (program configurator, live pricing, rewards feed,
   stage tabs), challenge-rules.html / payouts.html (scroll-spy TOC) and
   blog.html (category filter). Safe to load on any page — every init
   bails out when its markup is absent. */
(function () {
    "use strict";

    /* =========================================================
       1. PROGRAM DATA
       Edit prices / specs here only: every price on funding.html,
       the listing grid, the comparison table and the cart line are
       generated from this object.
       ========================================================= */
    var PROGRAMS = {
        "two-step": {
            id: "two-step",
            name: "2 Step Standard",
            tag: "Most popular · 2 phases",
            badge: "Best for beginners",
            blurb: "Two phases, the widest risk limits and the lowest entry price we offer.",
            specs: function (size) {
                return [
                    ["Profit target", "8% / 5%"],
                    ["Max loss", "10%"],
                    ["Daily loss", "5%"],
                    ["Min. trading days", "3"],
                    ["Profit split", "Up to 90%"],
                    ["Reward cycle", "Bi-weekly"]
                ];
            },
            sell: "Two phases to prove it, then a funded Master account with bi-weekly rewards."
        },
        "flex": {
            id: "flex",
            name: "1 Step Flex",
            tag: "New · single phase",
            badge: "Pass in one day",
            blurb: "One phase, no consistency rule, no minimum trading days — pass in as little as one day.",
            specs: function () {
                return [
                    ["Profit target", "10%"],
                    ["Max loss", "12% static"],
                    ["Daily loss", "4%"],
                    ["Min. trading days", "None"],
                    ["Profit split", "Up to 95%"],
                    ["Reward cycle", "Bi-weekly"]
                ];
            },
            sell: "One evaluation, 12% static drawdown and a 95% split once you're funded."
        },
        "zero": {
            id: "zero",
            name: "Zero Challenge",
            tag: "Instant funding",
            badge: "No challenge",
            blurb: "No evaluation at all. Buy the account, trade the funded account, request rewards weekly.",
            specs: function () {
                return [
                    ["Profit target", "None"],
                    ["Max loss", "6%"],
                    ["Daily loss", "3%"],
                    ["Min. trading days", "None"],
                    ["Profit split", "80%"],
                    ["First reward", "After 14 days"]
                ];
            },
            sell: "Skip the evaluation entirely — funded from minute one, 80% split paid weekly."
        }
    };

    /* Account sizes with per-program USD price. `was` = strike-through
       reference price for the promo banner. */
    var SIZES = [
        { label: "5K",  usd: 10000, price: { "two-step": 39,  "flex": 49,  "zero": 99 },   was: { "two-step": 45,  "flex": 59,  "zero": 119 } },
        { label: "10K", usd: 25000, price: { "two-step": 79,  "flex": 99,  "zero": 189 },  was: { "two-step": 92,  "flex": 119, "zero": 219 } },
        { label: "25K", usd: 50000, price: { "two-step": 179, "flex": 229, "zero": 449 },  was: { "two-step": 209, "flex": 269, "zero": 519 } },
        { label: "50K", usd: 100000, price: { "two-step": 289, "flex": 369, "zero": 749 }, was: { "two-step": 339, "flex": 429, "zero": 869 } },
        { label: "100K", usd: 200000, price: { "two-step": 499, "flex": 649, "zero": 1299 }, was: { "two-step": 555, "flex": 749, "zero": 1499 } },
        { label: "200K", usd: 400000, price: { "two-step": 949, "flex": 1249, "zero": 2499 }, was: { "two-step": 1099, "flex": 1449, "zero": 2799 } }
    ];

    /* Display-only currency conversion. Settlement is always in USD —
       the note under the price card says so, so nobody is surprised at
       checkout. Update rates with your finance/ops numbers. */
    var CURRENCIES = [
        { code: "USD", sym: "$",    rate: 1,     dec: 0, note: "Charged in USD" },
        { code: "EUR", sym: "€",    rate: 0.92,  dec: 0, note: "Approx. EUR, charged in USD" },
        { code: "GBP", sym: "£",    rate: 0.79,  dec: 0, note: "Approx. GBP, charged in USD" },
        { code: "KES", sym: "KSh ", rate: 129,   dec: 0, note: "Approx. KES, charged in USD" },
        { code: "NGN", sym: "₦",    rate: 1550,  dec: 0, note: "Approx. NGN, charged in USD" },
        { code: "ETB", sym: "Br ",  rate: 128,   dec: 0, note: "Approx. ETB, charged in USD" }
    ];

    var ADDONS = {
        swapfree: { id: "swapfree", title: "Swap-Free", pct: 10, desc: "Hold positions overnight without swap or interest charges. Common for traders in Muslim-majority markets." }
    };

    var PROMOS = {
        JOREEM20: { pct: 20, label: "20% off — first challenge" },
        HELLO:    { pct: 20, label: "20% off — welcome offer" },
        FLEX10:   { pct: 10, label: "10% off — Flex launch" }
    };

    /* =========================================================
       2. STATE
       ========================================================= */
    var state = {
        program: "two-step",
        size: "100K",
        currency: "USD",
        addons: {},
        promo: null
    };

    try {
        var saved = JSON.parse(sessionStorage.getItem("twj_fund_state") || "null");
        if (saved && PROGRAMS[saved.program]) {
            state.program = saved.program;
            if (SIZES.some(function (s) { return s.label === saved.size; })) state.size = saved.size;
            if (CURRENCIES.some(function (c) { return c.code === saved.currency; })) state.currency = saved.currency;
            state.addons = saved.addons || {};
            state.promo = saved.promo || null;
        }
    } catch (e) {}

    function persist() {
        try { sessionStorage.setItem("twj_fund_state", JSON.stringify(state)); } catch (e) {}
    }

    /* Deep link: funding.html?program=flex&size=25K&cur=KES&code=JOREEM20
       Also captures the promo code carried in an ad / affiliate link. */
    function readQuery() {
        var q = new URLSearchParams(window.location.search);
        var p = q.get("program");
        if (p && PROGRAMS[p]) state.program = p;
        var s = q.get("size");
        if (s && SIZES.some(function (x) { return x.label.toLowerCase() === s.toLowerCase(); })) {
            state.size = SIZES.filter(function (x) { return x.label.toLowerCase() === s.toLowerCase(); })[0].label;
        }
        var c = q.get("cur");
        if (c && CURRENCIES.some(function (x) { return x.code === c.toUpperCase(); })) state.currency = c.toUpperCase();
        var code = (q.get("code") || "").toUpperCase();
        if (PROMOS[code]) state.promo = code;
    }

    /* =========================================================
       3. PRICING
       ========================================================= */
    function sizeObj(label) {
        return SIZES.filter(function (s) { return s.label === label; })[0] || SIZES[4];
    }

    function promoPct() {
        return state.promo && PROMOS[state.promo] ? PROMOS[state.promo].pct : 0;
    }

    function pricing() {
        var s = sizeObj(state.size);
        var base = s.price[state.program];
        var was = s.was[state.program];
        var pct = promoPct();
        var discount = Math.round(base * pct / 100 * 100) / 100;
        var afterPromo = base - discount;
        var addonSum = 0;
        Object.keys(state.addons).forEach(function (k) {
            if (state.addons[k] && ADDONS[k]) addonSum += Math.round(afterPromo * ADDONS[k].pct / 100 * 100) / 100;
        });
        return {
            base: base,
            was: was,
            discount: discount,
            addonSum: addonSum,
            total: afterPromo + addonSum,
            pct: pct
        };
    }

    function money(usd) {
        var cur = CURRENCIES.filter(function (c) { return c.code === state.currency; })[0] || CURRENCIES[0];
        var v = usd * cur.rate;
        /* The amount you pay must match what is displayed, so USD keeps cents
           whenever the total is not a whole dollar (add-ons and promos produce
           figures like 251.90). Approximate local currencies are rounded to the
           nearest whole unit and carry an "approximate" note instead. */
        var showCents = cur.rate === 1 && Math.abs(v - Math.round(v)) > 0.004;
        var str = (showCents ? v.toFixed(2) : Math.round(v).toString())
            .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return cur.sym + str;
    }

    function usdMoney(v) {
        return "$" + (Math.round(v * 100) / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    /* =========================================================
       4. RENDER — configurator
       ========================================================= */
    function renderTabs() {
        document.querySelectorAll("[data-fp-program]").forEach(function (tab) {
            tab.classList.toggle("active", tab.getAttribute("data-fp-program") === state.program);
        });
    }

    function renderSizes() {
        document.querySelectorAll("[data-fp-size]").forEach(function (btn) {
            btn.classList.toggle("active", btn.getAttribute("data-fp-size") === state.size);
        });
    }

    function renderCurrencies() {
        document.querySelectorAll("[data-fp-cur]").forEach(function (btn) {
            btn.classList.toggle("active", btn.getAttribute("data-fp-cur") === state.currency);
        });
    }

    function renderSpecs() {
        var host = document.getElementById("fpSpecGrid");
        if (!host) return;
        var prog = PROGRAMS[state.program];
        host.innerHTML = prog.specs(state.size).map(function (row, i) {
            var cls = i === 0 ? "gold" : (row[0] === "Profit split" ? "green" : "");
            return '<div class="fp-spec"><div class="k">' + row[0] + '</div><div class="v ' + cls + '">' + row[1] + "</div></div>";
        }).join("");
    }

    function renderPrice() {
        var p = pricing();
        var prog = PROGRAMS[state.program];
        var cur = CURRENCIES.filter(function (c) { return c.code === state.currency; })[0];

        setText("fpPriceAmount", money(p.total));
        setText("fpPriceWas", p.pct ? money(p.was) : "");
        setText("fpPriceFor", "for a " + state.size + " " + prog.name + " account");
        setText("fpPriceNote", cur.note + " · one-time fee · no recurring charge");

        var off = document.getElementById("fpPriceOff");
        if (off) {
            off.style.display = p.pct ? "" : "none";
            off.textContent = p.pct + "% OFF";
        }

        var was = document.getElementById("fpPriceWas");
        if (was) was.style.display = p.pct ? "" : "none";

        var badge = document.getElementById("fpPriceBadge");
        if (badge) badge.textContent = prog.badge;

        var addonLine = document.getElementById("fpAddonLine");
        if (addonLine) {
            addonLine.style.display = p.addonSum ? "" : "none";
            addonLine.textContent = "Includes swap-free add-on: " + money(p.addonSum);
        }

        var saveLine = document.getElementById("fpSaveLine");
        if (saveLine) {
            saveLine.style.display = p.pct ? "" : "none";
            saveLine.textContent = "You save " + money(p.discount) + " with code " + state.promo;
        }

        var sticky = document.getElementById("fpStickyPrice");
        if (sticky) sticky.textContent = money(p.total);
        var stickyInfo = document.getElementById("fpStickyInfo");
        if (stickyInfo) stickyInfo.textContent = state.size + " · " + prog.name;

        var buy = document.getElementById("fpBuyBtn");
        if (buy) buy.setAttribute("data-price", p.total);
    }

    function setText(id, txt) {
        var el = document.getElementById(id);
        if (el) el.textContent = txt;
    }

    function renderListing() {
        var host = document.getElementById("fpListing");
        if (!host) return;
        var prog = PROGRAMS[state.program];
        var featured = state.size;
        host.innerHTML = SIZES.map(function (s) {
            var base = s.price[state.program];
            var rows = prog.specs(s.label).slice(0, 4).map(function (r) {
                return "<li><span>" + r[0] + "</span><b>" + r[1] + "</b></li>";
            }).join("");
            return '<div class="fp-list-card' + (s.label === featured ? " featured" : "") + '">' +
                (s.label === featured ? '<div class="lc-flag">Your selection</div>' : "") +
                '<div class="lc-size">' + s.label + " Account" +
                '<div class="fp-note" style="margin-top:4px">' + usdMoney(s.usd) + " simulated capital</div></div>" +
                '<div class="lc-price">' + money(base) + "</div>" +
                '<div class="lc-was">' + money(s.was[state.program]) + "</div>" +
                "<ul>" + rows + "</ul>" +
                '<button class="btn btn-outline-light w-100 py-3" data-fp-quick="' + s.label + '" data-fp-quick-program="' + state.program + '">' +
                '<i class="fa fa-bolt me-2"></i>Buy this account</button>' +
                "</div>";
        }).join("");

        host.querySelectorAll("[data-fp-quick]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                state.size = btn.getAttribute("data-fp-quick");
                state.program = btn.getAttribute("data-fp-quick-program");
                persist();
                renderAll();
                addToCart(btn);
            });
        });
    }

    function renderProgramBlurb() {
        var prog = PROGRAMS[state.program];
        setText("fpProgramName", prog.name);
        setText("fpProgramBlurb", prog.blurb);
        setText("fpProgramSell", prog.sell);
    }

    function renderAll() {
        renderTabs();
        renderSizes();
        renderCurrencies();
        renderSpecs();
        renderPrice();
        renderListing();
        renderProgramBlurb();
    }

    /* =========================================================
       5. CART BRIDGE
       ========================================================= */
    function skuTitle() {
        var prog = PROGRAMS[state.program];
        var extras = Object.keys(state.addons).filter(function (k) { return state.addons[k]; }).map(function (k) { return ADDONS[k].title; });
        var suffix = (state.promo ? " (" + state.promo + " applied)" : "") + (extras.length ? " + " + extras.join(" + ") : "");
        return prog.name + " · " + state.size + " Account" + suffix;
    }

    function addToCart(btn) {
        var p = pricing();
        if (!window.TWJ || typeof window.TWJ.addItem !== "function") {
            /* Cart engine not present on this page — fail loudly in dev,
               silently for the visitor. */
            if (window.console) console.warn("Cart engine (js/trading.js) not loaded on this page.");
            return;
        }
        var sku = [
            "eval", state.program, state.size.toLowerCase(),
            Object.keys(state.addons).filter(function (k) { return state.addons[k]; }).join("-"),
            state.promo || "std"
        ].filter(Boolean).join("-");

        window.TWJ.addItem({
            id: sku,
            title: skuTitle(),
            price: p.total,
            type: "digital",
            typeLabel: "Funded account challenge",
            img: "img/challenge-card.jpg"
        });
    }

    /* =========================================================
       6. INIT — configurator
       ========================================================= */
    function initConfigurator() {
        var root = document.getElementById("fpConfig");
        if (!root) return;

        readQuery();

        document.querySelectorAll("[data-fp-program]").forEach(function (tab) {
            tab.addEventListener("click", function () {
                state.program = tab.getAttribute("data-fp-program");
                persist();
                renderAll();
            });
        });

        document.querySelectorAll("[data-fp-size]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                state.size = btn.getAttribute("data-fp-size");
                persist();
                renderAll();
            });
        });

        document.querySelectorAll("[data-fp-cur]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                state.currency = btn.getAttribute("data-fp-cur");
                persist();
                renderAll();
            });
        });

        document.querySelectorAll("[data-fp-addon]").forEach(function (box) {
            var key = box.getAttribute("data-fp-addon");
            if (state.addons[key]) box.checked = true;
            box.addEventListener("change", function () {
                state.addons[key] = box.checked;
                persist();
                renderPrice();
            });
        });

        var promoInput = document.getElementById("fpPromoInput");
        var promoBtn = document.getElementById("fpPromoBtn");
        var promoMsg = document.getElementById("fpPromoMsg");
        /* One place that writes the promo feedback line, so a code arriving
           from an ad link (?code=JOREEM20) confirms itself on load too. */
        function setPromoMsg(kind) {
            if (!promoMsg) return;
            if (kind === "applied" && state.promo) {
                promoMsg.style.color = "var(--secondary)";
                promoMsg.textContent = "✓ " + PROMOS[state.promo].label + " applied.";
            } else if (kind === "invalid") {
                promoMsg.style.color = "var(--loss)";
                promoMsg.textContent = "That code isn't valid. Try JOREEM20.";
            }
        }

        function applyPromo() {
            if (!promoInput) return;
            var code = (promoInput.value || "").trim().toUpperCase();
            if (PROMOS[code]) {
                state.promo = code;
                setPromoMsg("applied");
            } else {
                state.promo = null;
                setPromoMsg("invalid");
            }
            persist();
            renderPrice();
            renderListing();
        }
        if (promoBtn) promoBtn.addEventListener("click", applyPromo);
        if (promoInput) {
            promoInput.addEventListener("keydown", function (e) {
                if (e.key === "Enter") { e.preventDefault(); applyPromo(); }
            });
        }
        if (state.promo) {
            if (promoInput) promoInput.value = state.promo;
            setPromoMsg("applied");
        }

        var buy = document.getElementById("fpBuyBtn");
        if (buy) {
            buy.addEventListener("click", function () {
                addToCart(buy);
                var orig = buy.innerHTML;
                buy.innerHTML = '<i class="fa fa-check me-2"></i>Added to cart';
                setTimeout(function () { buy.innerHTML = orig; }, 1600);
            });
        }

        var trial = document.getElementById("fpTrialBtn");
        if (trial) {
            trial.addEventListener("click", function () {
                var orig = trial.innerHTML;
                trial.innerHTML = '<i class="fa fa-check me-2"></i>Demo booked';
                setTimeout(function () { trial.innerHTML = orig; }, 1800);
            });
        }

        renderAll();
    }

    /* =========================================================
       7. INIT — promo bar (copy code)
       ========================================================= */
    function initPromoBar() {
        var codeBtn = document.getElementById("promoCopy");
        if (!codeBtn) return;
        codeBtn.addEventListener("click", function () {
            var code = codeBtn.getAttribute("data-code") || "JOREEM20";
            var done = function () {
                var orig = codeBtn.innerHTML;
                codeBtn.innerHTML = '<i class="fa fa-check"></i> ' + code + " copied";
                setTimeout(function () { codeBtn.innerHTML = orig; }, 1800);
            };
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(code).then(done, done);
            } else { done(); }
        });
        var close = document.getElementById("promoClose");
        if (close) {
            close.addEventListener("click", function () {
                var bar = document.getElementById("promoBar");
                if (bar) bar.remove();
            });
        }
    }

    /* =========================================================
       8. INIT — stage tabs (how it works)
       ========================================================= */
    function initStages() {
        var tabs = document.querySelectorAll("[data-fp-stage]");
        if (!tabs.length) return;
        tabs.forEach(function (tab) {
            tab.addEventListener("click", function () {
                var id = tab.getAttribute("data-fp-stage");
                tabs.forEach(function (t) { t.classList.toggle("active", t === tab); });
                document.querySelectorAll("[data-fp-stage-panel]").forEach(function (p) {
                    p.classList.toggle("active", p.getAttribute("data-fp-stage-panel") === id);
                });
            });
        });
    }

    /* =========================================================
       9. INIT — reward cycle + asset chips (trade on your terms)
       ========================================================= */
    var CYCLE_COPY = {
        Weekly: "Request rewards every 7 days on funded accounts — cash flow that matches how you trade.",
        "Bi-weekly": "The standard cycle on 2 Step and Flex accounts: request every 14 days, no caps on the number of payouts.",
        Monthly: "Prefer to let the account compound? Request monthly and keep more capital working.",
        "On demand": "Zero Challenge accounts can request at any time after the 14-day qualifying window.",
        Daily: "Available on select funded accounts for high-volume traders (1:100 leverage, raw spreads)."
    };

    var ASSET_COPY = {
        FX: "60+ currency pairs including all majors, minors and the popular African crosses.",
        Metals: "Gold, silver, platinum — full sized contracts with raw spreads.",
        Indices: "NAS100, SPX500, GER40, UK100 and more, cash and futures CFDs.",
        Crypto: "BTC, ETH and major altcoins, 24/7, weekend holding allowed.",
        Energies: "WTI, Brent and natural gas for the macro traders."
    };

    function initChips() {
        var cycleRow = document.getElementById("fpCycleChips");
        if (cycleRow) {
            cycleRow.querySelectorAll("[data-fp-cycle]").forEach(function (chip) {
                chip.addEventListener("click", function () {
                    cycleRow.querySelectorAll("[data-fp-cycle]").forEach(function (c) { c.classList.toggle("active", c === chip); });
                    setText("fpCycleCopy", CYCLE_COPY[chip.getAttribute("data-fp-cycle")] || "");
                });
            });
        }
        var assetRow = document.getElementById("fpAssetChips");
        if (assetRow) {
            assetRow.querySelectorAll("[data-fp-asset]").forEach(function (chip) {
                chip.addEventListener("click", function () {
                    assetRow.querySelectorAll("[data-fp-asset]").forEach(function (c) { c.classList.toggle("active", c === chip); });
                    setText("fpAssetCopy", ASSET_COPY[chip.getAttribute("data-fp-asset")] || "");
                });
            });
        }
    }

    /* =========================================================
       10. INIT — rewards feed
       SAMPLE DATA. Replace REWARD_SEED (or the renderer) with your
       live payouts webhook / API. See README → "Live rewards feed".
       ========================================================= */
    var REWARD_SEED = [
        { flag: "🇰🇪", who: "Trader from Kenya", amt: 1284.5, when: "2 min ago" },
        { flag: "🇳🇬", who: "Trader from Nigeria", amt: 862.0, when: "6 min ago" },
        { flag: "🇪🇹", who: "Trader from Ethiopia", amt: 431.75, when: "11 min ago" },
        { flag: "🇸🇴", who: "Trader from Somalia", amt: 296.4, when: "18 min ago" },
        { flag: "🇬🇭", who: "Trader from Ghana", amt: 512.9, when: "24 min ago" },
        { flag: "🇿🇦", who: "Trader from South Africa", amt: 1943.6, when: "31 min ago" },
        { flag: "🇹🇿", who: "Trader from Tanzania", amt: 388.25, when: "44 min ago" },
        { flag: "🇺🇬", who: "Trader from Uganda", amt: 274.8, when: "52 min ago" },
        { flag: "🇬🇧", who: "Trader from the UK", amt: 3108.15, when: "1 hr ago" },
        { flag: "🇮🇳", who: "Trader from India", amt: 764.3, when: "1 hr ago" },
        { flag: "🇵🇭", who: "Trader from the Philippines", amt: 655.0, when: "2 hrs ago" },
        { flag: "🇧🇷", who: "Trader from Brazil", amt: 1422.7, when: "2 hrs ago" }
    ];

    function feedRow(r, fresh) {
        return '<div class="fp-feed-row"' + (fresh ? ' style="background:rgba(22,199,132,.06)"' : "") + ">" +
            '<span class="flag">' + r.flag + "</span>" +
            '<span class="who"><b>' + r.who + "</b> just secured a reward</span>" +
            '<span class="amt">' + usdMoney(r.amt) + "</span>" +
            '<span class="when">' + r.when + "</span>" +
            "</div>";
    }

    function initFeed() {
        var body = document.getElementById("fpFeedBody");
        if (!body) return;
        var rows = REWARD_SEED.map(function (r) { return feedRow(r, false); }).join("");
        body.innerHTML = rows;
        var totals = REWARD_SEED.reduce(function (s, r) { return s + r.amt; }, 0);
        setText("fpFeedTotal", usdMoney(totals));
        setText("fpFeedCount", REWARD_SEED.length + " recent rewards");

        /* Simulated live prepend every few seconds so the widget feels
           alive. Delete this interval once the real feed is wired. */
        var i = 0;
        setInterval(function () {
            var r = REWARD_SEED[i % REWARD_SEED.length];
            i++;
            r = { flag: r.flag, who: r.who, amt: 120 + Math.random() * 2400, when: "just now" };
            body.insertAdjacentHTML("afterbegin", feedRow(r, true));
            while (body.children.length > 12) body.removeChild(body.lastElementChild);
        }, 5200);
    }

    /* =========================================================
       11. INIT — ledger (payouts.html sample payout wall)
       ========================================================= */
    var LEDGER = [
        { id: "TWJ-48210", name: "A. Mwangi", country: "🇰🇪 Kenya", program: "2 Step 100K", split: "90%", amount: 4820.6, method: "M-Pesa", days: "9 hrs" },
        { id: "TWJ-48204", name: "C. Okonkwo", country: "🇳🇬 Nigeria", program: "Flex 50K", split: "95%", amount: 2610.25, method: "Bank Transfer", days: "1 day" },
        { id: "TWJ-48198", name: "S. Tesfaye", country: "🇪🇹 Ethiopia", program: "2 Step 25K", split: "90%", amount: 1284.0, method: "Bank Transfer", days: "1 day" },
        { id: "TWJ-48190", name: "A. Hassan", country: "🇸🇴 Somalia", program: "Zero 10K", split: "80%", amount: 742.4, method: "Crypto (USDT)", days: "3 hrs" },
        { id: "TWJ-48184", name: "D. Mensah", country: "🇬🇭 Ghana", program: "2 Step 50K", split: "90%", amount: 3140.8, method: "Mobile Money", days: "6 hrs" },
        { id: "TWJ-48177", name: "L. Dlamini", country: "🇿🇦 South Africa", program: "Flex 200K", split: "95%", amount: 9875.5, method: "Bank Transfer", days: "1 day" },
        { id: "TWJ-48170", name: "R. Patel", country: "🇮🇳 India", program: "2 Step 100K", split: "90%", amount: 6122.35, method: "Bank Transfer", days: "2 days" },
        { id: "TWJ-48165", name: "M. Santos", country: "🇧🇷 Brazil", program: "Zero 25K", split: "80%", amount: 1896.15, method: "Crypto (USDT)", days: "4 hrs" }
    ];

    function initLedger() {
        var body = document.getElementById("fpLedgerBody");
        if (!body) return;
        body.innerHTML = LEDGER.map(function (r) {
            return "<tr>" +
                "<td>" + r.id + "</td>" +
                '<td class="name">' + r.name + " " + r.country + "</td>" +
                '<td class="name">' + r.program + "</td>" +
                "<td>" + r.split + "</td>" +
                '<td class="payout">' + usdMoney(r.amount) + "</td>" +
                '<td class="name">' + r.method + "</td>" +
                '<td class="name">' + r.days + "</td>" +
                "</tr>";
        }).join("");
    }

    /* =========================================================
       12. INIT — scroll-spy TOC + sticky buy bar
       ========================================================= */
    function initToc() {
        var links = document.querySelectorAll(".fp-toc a[href^='#']");
        if (!links.length) return;
        var sections = [];
        links.forEach(function (a) {
            var el = document.getElementById(a.getAttribute("href").slice(1));
            if (el) sections.push({ el: el, a: a });
        });
        function spy() {
            var y = window.scrollY + 140;
            var current = sections[0];
            sections.forEach(function (s) { if (s.el.offsetTop <= y) current = s; });
            links.forEach(function (a) { a.classList.toggle("active", current && a === current.a); });
        }
        window.addEventListener("scroll", spy, { passive: true });
        spy();
    }

    function initSticky() {
        var bar = document.getElementById("fpSticky");
        var anchor = document.getElementById("fpConfig");
        if (!bar || !anchor) return;
        window.addEventListener("scroll", function () {
            var past = window.scrollY > anchor.offsetTop + anchor.offsetHeight;
            var atEnd = window.scrollY + window.innerHeight > document.body.scrollHeight - 340;
            bar.classList.toggle("show", past && !atEnd);
        }, { passive: true });

        var btn = document.getElementById("fpStickyBuy");
        if (btn) btn.addEventListener("click", function () { addToCart(btn); });
    }

    /* =========================================================
       13. INIT — blog category filter
       ========================================================= */
    function initBlogFilter() {
        var row = document.getElementById("blogFilter");
        if (!row) return;
        row.querySelectorAll("[data-blog-cat]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var cat = btn.getAttribute("data-blog-cat");
                row.querySelectorAll("[data-blog-cat]").forEach(function (b) { b.classList.toggle("active", b === btn); });
                document.querySelectorAll("[data-post-cat]").forEach(function (card) {
                    var show = cat === "all" || card.getAttribute("data-post-cat") === cat;
                    card.style.display = show ? "" : "none";
                });
            });
        });
    }

    /* =========================================================
       14. INIT — risk quiz / profit calculator (funding.html widget)
       ========================================================= */
    function initCalculator() {
        var form = document.getElementById("fpCalc");
        if (!form) return;
        var sizeSel = document.getElementById("fpCalcSize");
        var splitSel = document.getElementById("fpCalcSplit");
        var pctInput = document.getElementById("fpCalcPct");
        var out = document.getElementById("fpCalcOut");
        var splitOut = document.getElementById("fpCalcSplitOut");
        var targetOut = document.getElementById("fpCalcTargetOut");

        function calc() {
            var capital = parseFloat(sizeSel.value);
            var split = parseFloat(splitSel.value);
            var pct = parseFloat(pctInput.value) || 0;
            var profit = capital * pct / 100;
            var payout = profit * split / 100;
            out.textContent = usdMoney(payout);
            splitOut.textContent = usdMoney(profit) + " gross @ " + split + "% split";
            targetOut.textContent = usdMoney(profit);
        }
        [sizeSel, splitSel, pctInput].forEach(function (el) { el.addEventListener("input", calc); });
        calc();
    }

    /* =========================================================
       BOOT
       ========================================================= */
    document.addEventListener("DOMContentLoaded", function () {
        initPromoBar();
        initConfigurator();
        initStages();
        initChips();
        initFeed();
        initLedger();
        initToc();
        initSticky();
        initBlogFilter();
        initCalculator();
    });

    /* Small public surface for other pages / future integrations. */
    window.TWJFunding = {
        programs: PROGRAMS,
        sizes: SIZES,
        state: state,
        pricing: pricing,
        money: money,
        promo: PROMOS,
        addToCart: addToCart
    };
})();
