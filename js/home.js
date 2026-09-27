/********** Trade with Joreem — Homepage engine (FundingPips-style) **********/
(function () {
    "use strict";

    /* ================= Promo bar ================= */
    function initPromo() {
        var bar = document.getElementById("promoBar");
        if (!bar) return;
        var dismissed = false;
        try { dismissed = localStorage.getItem("twj_promo_dismissed") === "1"; } catch (e) {}
        if (dismissed) { bar.style.display = "none"; return; }
        var close = document.getElementById("promoClose");
        if (close) close.addEventListener("click", function () {
            bar.style.transition = "all .35s";
            bar.style.opacity = "0";
            bar.style.transform = "translateY(-8px)";
            setTimeout(function () { bar.style.display = "none"; }, 350);
            try { localStorage.setItem("twj_promo_dismissed", "1"); } catch (e) {}
        });
        var code = document.getElementById("promoCode");
        if (code) code.addEventListener("click", function () {
            var done = function () {
                var orig = code.textContent;
                code.textContent = "COPIED!";
                setTimeout(function () { code.textContent = orig; }, 1400);
            };
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText("START20").then(done, done);
            } else { done(); }
        });
    }

    /* ================= Animated number counters (with separators) ================= */
    function animateCount(el) {
        var to = parseFloat(el.getAttribute("data-count-to")) || 0;
        var prefix = el.getAttribute("data-prefix") || "";
        var suffix = el.getAttribute("data-suffix") || "";
        var dur = 1600;
        var t0 = null;
        function fmt(v) {
            return prefix + Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + suffix;
        }
        function step(ts) {
            if (!t0) t0 = ts;
            var p = Math.min(1, (ts - t0) / dur);
            var ease = 1 - Math.pow(1 - p, 3);
            el.textContent = fmt(to * ease);
            if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }
    function initCounters() {
        var els = document.querySelectorAll("[data-count-to]");
        if (!els.length) return;
        if (!("IntersectionObserver" in window)) {
            els.forEach(animateCount);
            return;
        }
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (en.isIntersecting) {
                    animateCount(en.target);
                    io.unobserve(en.target);
                }
            });
        }, { threshold: 0.4 });
        els.forEach(function (el) { io.observe(el); });
    }

    /* ================= Pricing configurator ================= */
    var PRICING = {
        foundation: {
            name: "Foundation",
            flag: null,
            m:  { price: 49,  compare: null, per: "/month", checkout: "foundation",   bill: "Monthly billing" },
            a:  { price: 470, compare: 588, per: "/year",  checkout: "foundation-a", bill: "Annual billing" },
            specs: [
                ["Live Breakdowns", "Daily"],
                ["Curriculum", "40+ lessons"],
                ["Trade Reviews", "Weekly group"],
                ["1-on-1 Access", "&mdash;"],
                ["Community", "Telegram"],
                ["Books", "&mdash;"]
            ],
            note: "New students log their first reviewed trade within 2 weeks on average."
        },
        pro: {
            name: "Pro Trader",
            flag: "Most Popular",
            m:  { price: 59,  compare: null, per: "/month", checkout: "pro-m", bill: "Monthly billing" },
            a:  { price: 399, compare: 708, per: "/year",  checkout: "pro",       bill: "Annual billing" },
            specs: [
                ["Live Breakdowns", "Daily + replays"],
                ["Curriculum", "Full library"],
                ["Trade Reviews", "Graded weekly"],
                ["1-on-1 Access", "Monthly Q&amp;A"],
                ["Community", "TG + Discord"],
                ["Books", "All digital"]
            ],
            note: "Students hit their first green month in ~90 days on average."
        },
        elite: {
            name: "Elite Desk",
            flag: "1-on-1 Access",
            m:  { price: 119, compare: null, per: "/month", checkout: "elite-m", bill: "Monthly billing" },
            a:  { price: 999, compare: 1428, per: "/year",  checkout: "elite",    bill: "Annual billing" },
            specs: [
                ["Live Breakdowns", "Daily + replays"],
                ["Curriculum", "Full library"],
                ["Trade Reviews", "Graded weekly"],
                ["1-on-1 Access", "4 private sessions"],
                ["Community", "Private desk"],
                ["Books", "Full print set"]
            ],
            note: "Every Elite student gets a personalized 12-month trading roadmap."
        }
    };

    function initPricing() {
        var card = document.getElementById("priceCard");
        if (!card) return;
        var state = { plan: "pro", bill: "a" };

        var els = {
            plan: document.getElementById("pcPlan"),
            flag: document.getElementById("pcFlag"),
            amt: document.getElementById("pcAmt"),
            compare: document.getElementById("pcCompare"),
            per: document.getElementById("pcPer"),
            sub: document.getElementById("pcSub"),
            specs: document.getElementById("pcSpecs"),
            note: document.getElementById("pcNote"),
            buy: document.getElementById("pcBuy")
        };

        function render() {
            var p = PRICING[state.plan];
            var b = p[state.bill];
            els.plan.textContent = p.name;
            if (p.flag) {
                els.flag.textContent = p.flag;
                card.classList.add("featured");
            } else {
                card.classList.remove("featured");
            }
            els.amt.textContent = b.price.toLocaleString("en-US");
            if (b.compare) {
                els.compare.style.display = "";
                els.compare.textContent = "$" + b.compare.toLocaleString("en-US");
            } else {
                els.compare.style.display = "none";
            }
            els.per.textContent = b.per;
            els.sub.textContent = b.bill + " \u2022 for the " + p.name + " plan";
            els.specs.innerHTML = p.specs.map(function (s, i) {
                return '<div class="pc-spec"><div class="l">' + s[0] + '</div><div class="v' +
                    (i === 5 ? " gold" : "") + '">' + s[1] + "</div></div>";
            }).join("");
            els.note.innerHTML = '<i class="fa fa-chart-line"></i>' + p.note;
            els.buy.setAttribute("data-plan-checkout", b.checkout);
        }

        document.querySelectorAll(".seg-tab").forEach(function (tab) {
            tab.addEventListener("click", function () {
                document.querySelectorAll(".seg-tab").forEach(function (t) { t.classList.remove("active"); });
                tab.classList.add("active");
                state.plan = tab.getAttribute("data-plan");
                render();
            });
        });
        document.querySelectorAll(".bill-toggle button").forEach(function (btn) {
            btn.addEventListener("click", function () {
                document.querySelectorAll(".bill-toggle button").forEach(function (b) { b.classList.remove("active"); });
                btn.classList.add("active");
                state.bill = btn.getAttribute("data-bill");
                render();
            });
        });

        render();
    }

    /* ================= Equity curve sparkline (how-it-works step 3) ================= */
    function drawEquity(canvas) {
        if (!canvas) return;
        var ctx = canvas.getContext("2d");
        var pts = [];
        var v = 10;
        for (var i = 0; i < 26; i++) {
            v += (Math.random() * 3.2 - 0.85);
            v = Math.max(v, 6);
            pts.push(v);
        }

        function dpr() {
            var r = window.devicePixelRatio || 1;
            var w = canvas.clientWidth, h = canvas.clientHeight;
            canvas.width = w * r;
            canvas.height = h * r;
            ctx.setTransform(r, 0, 0, r, 0, 0);
            return { w: w, h: h };
        }

        function draw() {
            var s = dpr(), w = s.w, h = s.h;
            ctx.clearRect(0, 0, w, h);
            var hi = Math.max.apply(null, pts) * 1.12;
            var lo = Math.min.apply(null, pts) * 0.82;
            var padX = 34, padT = 12, padB = 22;
            var xOf = function (i) { return padX + (w - padX - 8) * (i / (pts.length - 1)); };
            var yOf = function (p) { return padT + (hi - p) / (hi - lo) * (h - padT - padB); };

            // grid
            ctx.strokeStyle = "rgba(148,178,255,.09)";
            ctx.lineWidth = 1;
            for (var g = 1; g < 4; g++) {
                var gy = padT + (h - padT - padB) * g / 4;
                ctx.beginPath(); ctx.moveTo(padX, gy); ctx.lineTo(w - 8, gy); ctx.stroke();
            }

            // area + line
            ctx.beginPath();
            pts.forEach(function (p, i) {
                var x = xOf(i), y = yOf(p);
                if (i === 0) ctx.moveTo(x, y);
                else {
                    var px = xOf(i - 1), py = yOf(pts[i - 1]);
                    ctx.bezierCurveTo((px + x) / 2, py, (px + x) / 2, y, x, y);
                }
            });
            ctx.strokeStyle = "#F0B429";
            ctx.lineWidth = 2.4;
            ctx.lineJoin = "round";
            ctx.stroke();
            ctx.lineTo(xOf(pts.length - 1), h - padB);
            ctx.lineTo(xOf(0), h - padB);
            ctx.closePath();
            var grad = ctx.createLinearGradient(0, padT, 0, h - padB);
            grad.addColorStop(0, "rgba(240,180,41,.3)");
            grad.addColorStop(1, "rgba(240,180,41,0)");
            ctx.fillStyle = grad;
            ctx.fill();

            // end dot
            var lx = xOf(pts.length - 1), ly = yOf(pts[pts.length - 1]);
            ctx.beginPath();
            ctx.arc(lx, ly, 4, 0, Math.PI * 2);
            ctx.fillStyle = "#F0B429";
            ctx.fill();

            // labels
            ctx.font = "700 10px 'JetBrains Mono', monospace";
            ctx.fillStyle = "#8FA1C2";
            ctx.textAlign = "left";
            ctx.fillText("WEEK 1", padX, h - 8);
            ctx.textAlign = "right";
            ctx.fillStyle = "#F0B429";
            ctx.fillText("REVIEWED EQUITY", w - 8, h - 8);
        }
        draw();
        window.addEventListener("resize", draw);
    }

    /* ================= Discord community feed ================= */
    var FLAGS = ["\uD83C\uDDF0\uD83C\uDDEA", "\uD83C\uDDF3\uD83C\uDDEC", "\uD83C\uDDEC\uD83C\uDDED", "\uD83C\uDDEC\uD83C\uDDF7", "\uD83C\uDDFF\uD83C\uDDE6", "\uD83C\uDDFA\uD83C\uDDF8", "\uD83C\uDDF9\uD83C\uDDFF", "\uD83C\uDDFA\uD83C\uDDEC", "\uD83C\uDDE8\uD83C\uDDE6", "\uD83C\uDDE9\uD83C\uDDEA"];
    var WIN_POOL = [
        "just logged <b>+2.4R</b> on XAU/USD!",
        "passed their <b>risk audit</b> with zero breaches!",
        "hit <b>3 green weeks</b> in a row!",
        "submitted journal <b>#14</b> for grading!",
        "banked their first <b>$1K month</b>!",
        "locked in <b>0.5% risk</b> for a full month!",
        "aced the London session <b>breakdown quiz</b>!",
        "finished the <b>Foundation curriculum</b>!",
        "cut their drawdown in <b>half</b> this month!",
        "passed challenge <b>phase 1</b> with the system!"
    ];
    var MENTOR_POOL = [
        "Today's London breakdown is live in <span class='gold'>#study-rooms</span>.",
        "Journal reviews are out &mdash; check <span class='gold'>#trade-reviews</span>.",
        "New lesson dropped: sizing like a professional.",
        "Q&amp;A starts in 30 minutes. Bring your charts."
    ];

    function stamp() {
        var d = new Date();
        var h = d.getHours() % 12 || 12;
        var m = String(d.getMinutes()).padStart(2, "0");
        var ap = d.getHours() >= 12 ? "PM" : "AM";
        return h + ":" + m + " " + ap;
    }
    function msgHTML(o) {
        return '<div class="dw-msg">' +
            '<div class="av ' + (o.mentor ? "" : "bot") + '">' + (o.mentor ? '<i class="fa fa-user-tie"></i>' : '<i class="fa fa-robot"></i>') + "</div>" +
            '<div><div class="meta"><b>' + o.who + "</b> " + (o.mentor ? '<span class="gold">MENTOR</span> ' : "BOT ") + "\u2022 " + o.time + "</div>" +
            '<div class="txt">' + o.txt + "</div></div></div>";
    }

    function initDiscordFeed() {
        var feed = document.getElementById("dwFeed");
        if (!feed) return;
        var msgs = [
            { who: "Joreem Bot", time: stamp(), txt: "A student from " + FLAGS[0] + " just logged <b>+2.1R</b> on EUR/USD!" },
            { who: "Joreem Bot", time: stamp(), txt: "A student from " + FLAGS[1] + " hit their <b>first green month</b>!" },
            { who: "Joreem", mentor: true, time: stamp(), txt: "Today's New York breakdown starts in 1 hour. Bring your levels." },
            { who: "Joreem Bot", time: stamp(), txt: "A student from " + FLAGS[2] + " passed their <b>phase 2 review</b>!" }
        ];
        feed.innerHTML = msgs.map(msgHTML).join("");

        var wi = 0, mi = 0;
        setInterval(function () {
            var isMentor = (mi < 2) && Math.random() < 0.22;
            var m;
            if (isMentor) {
                m = { who: "Joreem", mentor: true, time: stamp(), txt: MENTOR_POOL[mi++ % MENTOR_POOL.length] };
            } else {
                var flag = FLAGS[Math.floor(Math.random() * FLAGS.length)];
                m = { who: "Joreem Bot", time: stamp(), txt: "A student from " + flag + " " + WIN_POOL[wi++ % WIN_POOL.length] };
            }
            feed.insertAdjacentHTML("afterbegin", msgHTML(m));
            var nodes = feed.querySelectorAll(".dw-msg");
            if (nodes.length > 6) nodes[nodes.length - 1].remove();
        }, 4200);
    }

    /* ================= Boot ================= */
    document.addEventListener("DOMContentLoaded", function () {
        initPromo();
        initCounters();
        initPricing();
        drawEquity(document.getElementById("howEquity"));
        initDiscordFeed();
    });
})();
