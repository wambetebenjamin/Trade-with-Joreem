/********** Trade with Joreem — Get Funded picker **********/
(function () {
    "use strict";

    /* Program definitions. Prices are illustrative front-end demo values. */
    var PROGRAMS = {
        fast: {
            name: "Fast Funded",
            desc: "1 phase • quicker to Master",
            tagline: "Single-phase sprint to a funded account.",
            specTag: "Fast Funded",
            popular: false,
            split: null, // no split toggle
            base:    { "5": 32, "10": 59, "25": 139, "50": 219, "100": 399 },
            was:     { "5": 40, "10": 74, "25": 174, "50": 258, "100": 469 },
            addon:   "Swap-aware model included",
            phases: "1 phase",
            target: "12% (single)",
            daily:   "4%",
            maxLoss: "10% (static)",
            minDays: "None — 2-day pass",
            cycle:   "Weekly, 85%",
            splitRow: "Weekly rewards · 85% split · mentoring incl."
        },
        standard: {
            name: "2-Step Pro",
            desc: "lower target • most popular",
            tagline: "Two fair phases with a larger split.",
            specTag: "2-Step Pro",
            popular: true,
            split: true,
            base:    { "5": 49, "10": 99, "25": 189, "50": 229, "100": 449 },
            was:     { "5": 58, "10": 116, "25": 222, "50": 269, "100": 528 },
            addon:   "95% split add-on available",
            phases: "2 phases",
            target: "8% then 5%",
            daily:   "4%",
            maxLoss: "10% (static)",
            minDays: "2 days minimum",
            cycle:   "Weekly / Biweekly",
            splitRow: "Biweekly 85% standard · 95% add-on"
        },
        elite: {
            name: "Elite Scale",
            desc: "100% split • $200K route",
            tagline: "The full route to maximum capital.",
            specTag: "Elite Scale",
            popular: false,
            split: null,
            base:    { "5": 79, "10": 149, "25": 299, "50": 549, "100": 999 },
            was:     { "5": 93, "10": 175, "25": 352, "50": 646, "100": 1175 },
            addon:   "100% split · priority scaling",
            phases: "2 phases",
            target: "8% then 5%",
            daily:   "4%",
            maxLoss: "10% (static)",
            minDays: "1 day minimum",
            cycle:   "On demand, 100%",
            splitRow: "100% split · priority scaling · lifetime desk"
        }
    };

    var SIZES = ["5", "10", "25", "50", "100"];
    var state = { prog: "standard", size: "50", split: "85" };

    /* Live payout feed (rotating demo entries — names are anonymous handles by design) */
    var FEED = [
        { flag: "\u{1F1F0}\u{1F1EA}", who: "A trader from Nairobi", amt: "$1,240.00" },
        { flag: "\u{1F1F3}\u{1F1EC}", who: "A trader from Lagos", amt: "$860.00" },
        { flag: "\u{1F1EA}\u{1F1F9}", who: "A trader from Addis Ababa", amt: "$540.50" },
        { flag: "\u{1F1F8}\u{1F1F4}", who: "A trader from Mogadishu", amt: "$312.00" },
        { flag: "\u{1F1EC}\u{1F1ED}", who: "A trader from Accra", amt: "$1,055.20" },
        { flag: "\u{1F1FF}\u{1F1E6}", who: "A trader from Johannesburg", amt: "$720.00" },
        { flag: "\u{1F1FA}\u{1F1F8}", who: "A trader from New York", amt: "$2,410.00" },
        { flag: "\u{1F1EC}\u{1F1E7}", who: "A trader from London", amt: "$1,890.50" },
        { flag: "\u{1F1F9}\u{1F1F7}", who: "A trader from Istanbul", amt: "$640.00" },
        { flag: "\u{1F1EE}\u{1F1F3}", who: "A trader from Jakarta", amt: "$510.00" }
    ];

    function fmtPrice(n) {
        return "$" + n.toLocaleString("en-US");
    }

    function render() {
        var prog = PROGRAMS[state.prog];
        var now = prog.base[state.size];
        var was = prog.was[state.size];
        var off = Math.round((1 - now / was) * 100);

        // price card
        var progEl = document.getElementById("fpPriceProg");
        if (progEl) progEl.textContent = prog.name + " • $" + state.size + "K Account";
        var addonEl = document.getElementById("fpAddon");
        if (addonEl) addonEl.textContent = prog.addon;
        var nowEl = document.getElementById("fpPriceNow");
        if (nowEl) nowEl.textContent = fmtPrice(now);
        var wasEl = document.getElementById("fpPriceWas");
        if (wasEl) wasEl.textContent = fmtPrice(was);
        var offEl = document.getElementById("fpPriceOff");
        if (offEl) offEl.textContent = off + "% OFF";

        // popular flag
        var flag = document.querySelector("#fpPriceCard .fp-pop-flag");
        if (flag) flag.style.display = prog.popular ? "" : "none";
        var card = document.getElementById("fpPriceCard");
        if (card) card.classList.toggle("popular", prog.popular);

        // split toggle visibility (2-step only)
        var splitRow = document.getElementById("fpSplitRow");
        if (splitRow) splitRow.style.display = prog.split ? "" : "none";

        // spec grid
        var grid = document.getElementById("fpSpecGrid");
        var tag = document.getElementById("fpSpecTag");
        if (tag) tag.textContent = prog.specTag;
        if (grid) {
            var rows = [
                ["Phases", prog.phases],
                ["Profit target", prog.target],
                ["Max loss", prog.maxLoss],
                ["Daily loss", prog.daily],
                ["Min. trading days", prog.minDays],
                ["Reward split", state.split === "95" ? "Up to 95%" : prog.cycle]
            ];
            if (state.split === "95" && prog.split) rows[5][1] = "Biweekly up to 95%";
            grid.innerHTML = rows.map(function (r, i) {
                var isGold = i === 1 || i === 5;
                return '<div class="fp-spec-row"><span class="k">' + r[0] + '</span>' +
                    '<span class="v' + (isGold ? ' gold' : '') + '">' + r[1] + '</span></div>';
            }).join("");
        }

        // sync active state of buttons
        document.querySelectorAll("#fpPills .fp-pill").forEach(function (b) {
            b.classList.toggle("active", b.getAttribute("data-prog") === state.prog);
        });
        document.querySelectorAll("#fpSizes .fp-size").forEach(function (b) {
            b.classList.toggle("active", b.getAttribute("data-size") === state.size);
        });
    }

    function initPills() {
        document.querySelectorAll("#fpPills .fp-pill").forEach(function (b) {
            b.addEventListener("click", function () {
                state.prog = b.getAttribute("data-prog");
                if (!PROGRAMS[state.prog].split) state.split = "85";
                render();
            });
        });
        document.querySelectorAll("#fpSizes .fp-size").forEach(function (b) {
            b.addEventListener("click", function () {
                state.size = b.getAttribute("data-size");
                render();
            });
        });
        var splitSeg = document.querySelectorAll("#fpSplitRow .seg button");
        splitSeg.forEach(function (b) {
            b.addEventListener("click", function () {
                state.split = b.getAttribute("data-split");
                splitSeg.forEach(function (x) { x.classList.remove("active"); });
                b.classList.add("active");
                render();
            });
        });
        var buy = document.getElementById("fpBuyBtn");
        if (buy) {
            buy.addEventListener("click", function () {
                if (window.TWJ && window.TWJ.buyFunding) {
                    window.TWJ.buyFunding(PROGRAMS[state.prog], state.size, state.split);
                }
            });
        }
    }

    function initFeed() {
        var track = document.getElementById("fpFeedTrack");
        if (!track) return;
        var html = FEED.map(function (f) {
            return '<div class="fp-feed-item">' +
                '<span class="flag">' + f.flag + '</span>' +
                '<span>' + f.who + '</span>' +
                '<span class="amt">' + f.amt + '</span>' +
                '<span class="via">M-Pesa</span>' +
                '</div>';
        }).join("");
        track.innerHTML = html + html; // duplicate for seamless loop
    }

    document.addEventListener("DOMContentLoaded", function () {
        initPills();
        initFeed();
        render();
    });
})();
