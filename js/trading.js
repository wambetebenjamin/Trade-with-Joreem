/********** Trade with Joreem — Interactive Engine **********/
(function () {
    "use strict";

    var fmtMoney = function (n) {
        return "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };

    /* ================= Ticker tape ================= */
    var TICKER = [
        { sym: "EUR/USD", price: 1.18420, dec: 5 },
        { sym: "GBP/USD", price: 1.36780, dec: 5 },
        { sym: "USD/JPY", price: 151.240, dec: 3 },
        { sym: "XAU/USD", price: 2412.35, dec: 2 },
        { sym: "BTC/USD", price: 98412.5, dec: 0 },
        { sym: "ETH/USD", price: 3418.62, dec: 2 },
        { sym: "NAS100", price: 21248.4, dec: 1 },
        { sym: "SPX500", price: 6087.9, dec: 1 },
        { sym: "USOIL", price: 71.42, dec: 2 },
        { sym: "NATGAS", price: 3.184, dec: 3 }
    ];

    function tickerRow() {
        return TICKER.map(function (t) {
            var chg = (Math.random() * 0.8 - 0.32).toFixed(2);
            var up = parseFloat(chg) >= 0;
            return '<span class="ticker-item ' + (up ? "up" : "down") + '" data-sym="' + t.sym + '">' +
                '<span class="t-sym">' + t.sym + "</span>" +
                '<span class="t-price">' + t.price.toFixed(t.dec) + "</span>" +
                '<span class="t-chg">' + (up ? "▲" : "▼") + " " + Math.abs(parseFloat(chg)) + "%</span>" +
                "</span>";
        }).join("");
    }

    function initTicker() {
        var wrap = document.querySelector(".ticker-track");
        if (!wrap) return;
        wrap.innerHTML = tickerRow() + tickerRow();
        setInterval(function () {
            var t = TICKER[Math.floor(Math.random() * TICKER.length)];
            var drift = t.price * (Math.random() * 0.0016 - 0.0007);
            t.price = Math.max(t.price + drift, t.price * 0.995);
            var items = wrap.querySelectorAll('[data-sym="' + t.sym + '"] .t-price');
            var up = drift >= 0;
            items.forEach(function (el) {
                el.textContent = t.price.toFixed(t.dec);
                el.parentElement.classList.remove("flash-up", "flash-down");
                void el.offsetWidth;
                el.parentElement.classList.add(up ? "flash-up" : "flash-down");
            });
        }, 2200);
    }

    /* ================= Candlestick terminal ================= */
    function initTerminal() {
        var canvas = document.getElementById("candleCanvas");
        if (!canvas) return;
        var ctx = canvas.getContext("2d");
        if (typeof ctx.roundRect !== "function") {
            ctx.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); };
        }
        var priceEl = document.getElementById("termPrice");
        var chgEl = document.getElementById("termChg");
        var ohlcEl = document.getElementById("ohlcRow");
        var timeEl = document.getElementById("termTime");

        var candles = [];
        var seed = 1.1842;
        for (var i = 0; i < 44; i++) {
            var o = seed;
            var move = (Math.random() - 0.46) * 0.0011;
            var c = o + move;
            var h = Math.max(o, c) + Math.random() * 0.0005;
            var l = Math.min(o, c) - Math.random() * 0.0005;
            candles.push({ o: o, h: h, l: l, c: c });
            seed = c;
        }
        var base = candles[0].o;

        function dpr() {
            var r = window.devicePixelRatio || 1;
            var w = canvas.clientWidth, h = canvas.clientHeight;
            canvas.width = w * r;
            canvas.height = h * r;
            ctx.setTransform(r, 0, 0, r, 0, 0);
            return { w: w, h: h };
        }

        function draw(progress) {
            var s = dpr(), w = s.w, h = s.h;
            ctx.clearRect(0, 0, w, h);
            var shown = Math.max(2, Math.floor(candles.length * (progress || 1)));
            var slice = candles.slice(-shown);
            var hi = -Infinity, lo = Infinity;
            slice.forEach(function (c) { hi = Math.max(hi, c.h); lo = Math.min(lo, c.l); });
            var pad = (hi - lo) * 0.12 || 0.0005;
            hi += pad; lo -= pad;
            var plotH = h - 8;
            var yOf = function (p) { return 4 + (hi - p) / (hi - lo) * plotH; };

            // grid
            ctx.strokeStyle = "rgba(148,178,255,.08)";
            ctx.lineWidth = 1;
            for (var g = 1; g < 5; g++) {
                var gy = (h / 5) * g;
                ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
            }

            var n = slice.length;
            var slot = w / n;
            var bw = Math.max(3, slot * 0.55);

            slice.forEach(function (c, idx) {
                var x = slot * idx + slot / 2;
                var up = c.c >= c.o;
                var col = up ? "#16C784" : "#F6465D";
                ctx.strokeStyle = col;
                ctx.fillStyle = col;
                ctx.lineWidth = 1.4;
                ctx.beginPath();
                ctx.moveTo(x, yOf(c.h)); ctx.lineTo(x, yOf(c.l));
                ctx.stroke();
                var top = yOf(Math.max(c.o, c.c));
                var bh = Math.max(2, Math.abs(yOf(c.o) - yOf(c.c)));
                if (up) {
                    ctx.globalAlpha = .9;
                    ctx.fillStyle = "rgba(22,199,132,.28)";
                    ctx.fillRect(x - bw / 2, top, bw, bh);
                    ctx.globalAlpha = 1;
                    ctx.strokeRect(x - bw / 2, top, bw, bh);
                } else {
                    ctx.fillRect(x - bw / 2, top, bw, bh);
                }
            });

            // last price line
            var last = candles[candles.length - 1];
            var ly = yOf(last.c);
            var lastUp = last.c >= base;
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = lastUp ? "rgba(22,199,132,.55)" : "rgba(246,70,93,.55)";
            ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(w, ly); ctx.stroke();
            ctx.setLineDash([]);
            var label = last.c.toFixed(5);
            ctx.font = "700 10px 'JetBrains Mono', monospace";
            var tw = ctx.measureText(label).width + 10;
            ctx.fillStyle = lastUp ? "#16C784" : "#F6465D";
            var lx = w - tw - 4;
            ctx.beginPath();
            ctx.roundRect(lx, ly - 9, tw, 18, 4);
            ctx.fill();
            ctx.fillStyle = "#04121C";
            ctx.fillText(label, lx + 5, ly + 3.5);

            // readouts
            if (priceEl) {
                priceEl.textContent = last.c.toFixed(5);
                var diff = ((last.c - base) / base * 100);
                if (chgEl) {
                    chgEl.textContent = (diff >= 0 ? "+" : "") + diff.toFixed(2) + "%";
                    chgEl.className = "terminal-chg " + (diff >= 0 ? "up" : "down");
                }
                if (ohlcEl) {
                    ohlcEl.innerHTML =
                        "<span>O <b>" + last.o.toFixed(5) + "</b></span>" +
                        "<span>H <b>" + last.h.toFixed(5) + "</b></span>" +
                        "<span>L <b>" + last.l.toFixed(5) + "</b></span>" +
                        "<span>C <b>" + last.c.toFixed(5) + "</b></span>" +
                        "<span style='margin-left:auto'>M30 &bull; EUR/USD</span>";
                }
            }
            if (timeEl) {
                var d = new Date();
                timeEl.textContent = "LIVE " + String(d.getHours()).padStart(2, "0") + ":" +
                    String(d.getMinutes()).padStart(2, "0") + ":" + String(d.getSeconds()).padStart(2, "0");
            }
        }

        // animate in
        var t0 = null;
        function step(ts) {
            if (!t0) t0 = ts;
            var p = Math.min(1, (ts - t0) / 1400);
            draw(p);
            if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);

        // live updates: mutate last candle, push new one
        setInterval(function () {
            var last = candles[candles.length - 1];
            var move = (Math.random() - 0.48) * 0.0009;
            last.c += move;
            last.h = Math.max(last.h, last.c);
            last.l = Math.min(last.l, last.c);
            if (Math.random() < 0.4) {
                var o = last.c;
                candles.push({ o: o, h: o + Math.random() * 0.0004, l: o - Math.random() * 0.0004, c: o + (Math.random() - 0.45) * 0.0008 });
                if (candles.length > 60) candles.shift();
                base = candles[0].o;
            }
            draw(1);
        }, 1800);

        window.addEventListener("resize", function () { draw(1); });
    }

    /* ================= Cart ================= */
    var CATALOG = {
        "forex-mastery":  { id: "forex-mastery",  title: "Forex Mastery",            type: "print",   price: 59, img: "assets/books/forex-mastery.jpg" },
        "crypto-signals": { id: "crypto-signals", title: "Crypto Signals Handbook",  type: "digital", price: 29, img: "assets/books/crypto-signals.jpg",  file: "assets/books/crypto-signals.pdf" },
        "psychology":     { id: "psychology",     title: "Trading Psychology",       type: "print",   price: 49, img: "assets/books/psychology.jpg" },
        "stocks-zero":    { id: "stocks-zero",    title: "Stocks from Zero",         type: "digital", price: 25, img: "assets/books/stocks-from-zero.jpg", file: "assets/books/stocks-from-zero.pdf" },
        "bundle":         { id: "bundle",         title: "The Complete Library",     type: "bundle",  price: 99, img: "assets/books/forex-mastery.jpg" }
    };

    var SHIP_RATES = [
        { id: "ke", label: "Kenya", rate: 5 },
        { id: "ng", label: "Nigeria", rate: 8 },
        { id: "ug", label: "Uganda", rate: 8 },
        { id: "tz", label: "Tanzania", rate: 8 },
        { id: "za", label: "South Africa", rate: 12 },
        { id: "int", label: "International (Other)", rate: 18 }
    ];

    var cart = [];
    try { cart = JSON.parse(localStorage.getItem("twj_cart") || "[]"); } catch (e) { cart = []; }

    function saveCart() {
        try { localStorage.setItem("twj_cart", JSON.stringify(cart)); } catch (e) {}
    }

    function cartCount() {
        return cart.reduce(function (s, i) { return s + i.qty; }, 0);
    }

    function cartTotals() {
        var sub = 0, hasPrint = false, hasDigital = false;
        cart.forEach(function (i) {
            var p = CATALOG[i.id];
            if (!p) return;
            sub += p.price * i.qty;
            if (p.type === "print" || p.type === "bundle") hasPrint = true;
            if (p.type === "digital" || p.type === "bundle") hasDigital = true;
        });
        var shipSel = document.getElementById("shipRegion");
        var region = shipSel ? shipSel.value : "ke";
        var ship = 0;
        if (hasPrint) {
            var r = SHIP_RATES.filter(function (x) { return x.id === region; })[0];
            ship = r ? r.rate : 5;
            if (sub >= 100) ship = 0; // free shipping over $100 on print
        }
        return { sub: sub, ship: ship, total: sub + ship, hasPrint: hasPrint, hasDigital: hasDigital };
    }

    function renderCart() {
        var body = document.getElementById("cartItems");
        document.querySelectorAll(".cart-badge").forEach(function (badge) {
            badge.textContent = cartCount();
            if (badge.classList.contains("d-none")) {
                badge.classList.toggle("d-none", cartCount() === 0);
                if (cartCount() > 0) badge.style.display = "inline-flex";
            } else {
                badge.style.display = cartCount() ? "" : "none";
            }
        });
        if (!body) return;
        if (!cart.length) {
            body.innerHTML = '<div class="cart-empty"><i class="fa fa-shopping-basket"></i>' +
                "<p>Your cart is empty.</p><p style='font-size:12.5px'>Grab a book or join the mentorship to get started.</p></div>";
        } else {
            body.innerHTML = cart.map(function (i, idx) {
                var p = CATALOG[i.id];
                return '<div class="cart-item">' +
                    '<img src="' + p.img + '" alt="' + p.title + '">' +
                    '<div class="ci-body">' +
                    '<div class="ci-title">' + p.title + "</div>" +
                    '<div class="ci-type">' + (p.type === "digital" ? "Instant PDF" : p.type === "bundle" ? "Bundle" : "Print book") + "</div>" +
                    '<div class="ci-row">' +
                    '<span class="qty-ctrl">' +
                    '<button data-act="dec" data-idx="' + idx + '" aria-label="Decrease">&minus;</button>' +
                    "<span>" + i.qty + "</span>" +
                    '<button data-act="inc" data-idx="' + idx + '" aria-label="Increase">+</button>' +
                    "</span>" +
                    '<span class="ci-price">' + fmtMoney(p.price * i.qty) + "</span>" +
                    '</div></div>' +
                    '<button class="ci-remove" data-act="rm" data-idx="' + idx + '" aria-label="Remove"><i class="fa fa-trash-alt"></i></button>' +
                    "</div>";
            }).join("");
        }
        var foot = document.getElementById("cartFoot");
        if (foot) {
            var t = cartTotals();
            foot.innerHTML =
                '<div class="cart-line"><span>Subtotal</span><span class="mono">' + fmtMoney(t.sub) + "</span></div>" +
                (t.hasPrint
                    ? '<div class="cart-line"><span>Shipping</span><span class="mono">' + (t.ship === 0 ? '<span class="free">FREE</span>' : fmtMoney(t.ship)) + "</span></div>"
                    : "") +
                (t.sub >= 100 && t.hasPrint ? '<div class="cart-line" style="font-size:12px;color:var(--secondary)"><i class="fa fa-truck me-1"></i>Free shipping unlocked (orders $100+)</div>' : "") +
                '<div class="cart-line total"><span>Total</span><span class="mono">' + fmtMoney(t.total) + "</span></div>" +
                '<button class="btn btn-primary w-100 py-3 mt-2" id="coOpenBtn"><i class="fa fa-lock me-2"></i>Secure Checkout</button>' +
                '<p class="mt-2 mb-0" style="font-size:11.5px;color:#5F7194;text-align:center">Cards &bull; PayPal &bull; M-Pesa &bull; Airtel &bull; Pesapal</p>';
        }
    }

    function addToCart(id, btn) {
        var p = CATALOG[id];
        if (!p) return;
        var found = cart.filter(function (i) { return i.id === id; })[0];
        if (found) found.qty++;
        else cart.push({ id: id, qty: 1 });
        saveCart();
        renderCart();
        openCart();
        if (btn) {
            var orig = btn.innerHTML;
            btn.classList.add("added");
            btn.innerHTML = '<i class="fa fa-check"></i> Added';
            setTimeout(function () {
                btn.classList.remove("added");
                btn.innerHTML = orig;
            }, 1400);
        }
    }

    function openCart() {
        var d = document.getElementById("cartDrawer");
        var o = document.getElementById("cartOverlay");
        if (d) d.classList.add("open");
        if (o) o.classList.add("open");
        document.body.style.overflow = "hidden";
    }

    function closeCart() {
        var d = document.getElementById("cartDrawer");
        var o = document.getElementById("cartOverlay");
        if (d) d.classList.remove("open");
        if (o) o.classList.remove("open");
        document.body.style.overflow = "";
    }

    function initCart() {
        var drawer = document.getElementById("cartDrawer");
        if (!drawer) return;
        renderCart();

        document.querySelectorAll("[data-add-to-cart]").forEach(function (btn) {
            btn.addEventListener("click", function () { addToCart(btn.getAttribute("data-add-to-cart"), btn); });
        });
        document.querySelectorAll("[data-open-cart]").forEach(function (btn) {
            btn.addEventListener("click", openCart);
        });
        var overlay = document.getElementById("cartOverlay");
        if (overlay) overlay.addEventListener("click", closeCart);
        var closeBtn = document.getElementById("cartClose");
        if (closeBtn) closeBtn.addEventListener("click", closeCart);

        document.getElementById("cartItems").addEventListener("click", function (e) {
            var b = e.target.closest("[data-act]");
            if (!b) return;
            var idx = parseInt(b.getAttribute("data-idx"), 10);
            var act = b.getAttribute("data-act");
            if (act === "inc") cart[idx].qty++;
            if (act === "dec") { cart[idx].qty--; if (cart[idx].qty < 1) cart.splice(idx, 1); }
            if (act === "rm") cart.splice(idx, 1);
            saveCart();
            renderCart();
        });

        document.getElementById("cartFoot").addEventListener("click", function (e) {
            if (e.target.closest("#coOpenBtn")) startCheckout("books");
        });

        var shipSel = document.getElementById("shipRegion");
        if (shipSel) shipSel.addEventListener("change", renderCart);

        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") closeCart();
        });
    }

    /* ================= Checkout =================
       Front-end demo of the payment flow. In production, wire:
       - Card   -> Stripe Payment Element (publishable key in js/payments.js)
       - PayPal -> PayPal JS SDK buttons
       - MoMo   -> Flutterwave Checkout (M-Pesa / Airtel Money)
       - Pesapal-> Pesapal form redirect
       The success screen is where the Telegram invite link is issued.
    ================================================= */
    var checkoutMode = null; // "books" | "mentorship"
    var checkoutPlan = null;

    var PLANS = {
        foundation: { id: "foundation", name: "Foundation — Monthly", price: 49, per: "/month", months: 1 },
        pro:        { id: "pro",        name: "Pro Trader — Annual",  price: 399, per: "/year",  months: 12 },
        elite:      { id: "elite",      name: "Elite Desk — Annual",  price: 999, per: "/year",  months: 12 }
    };

    function coLines() {
        var modal = document.getElementById("coItems");
        if (!modal) return;
        if (checkoutMode === "mentorship" && checkoutPlan) {
            var p = PLANS[checkoutPlan];
            modal.innerHTML =
                '<div class="co-item-line"><span><i class="fa fa-graduation-cap me-2 text-primary"></i>' + p.name + "</span><span class='amt'>" + fmtMoney(p.price) + "</span></div>" +
                '<div class="co-item-line"><span style="color:var(--secondary)"><i class="fa fa-check me-2"></i>Private Telegram access</span><span class="amt">Included</span></div>' +
                '<div class="co-item-line total" style="border-top:1px dashed var(--line);margin-top:8px;padding-top:12px;font-weight:700;color:#fff"><span>Total due today</span><span class="amt">' + fmtMoney(p.price) + "</span></div>";
        } else {
            var t = cartTotals();
            var rows = cart.map(function (i) {
                var p = CATALOG[i.id];
                return '<div class="co-item-line"><span>' + p.title + " &times; " + i.qty + "</span><span class='amt'>" + fmtMoney(p.price * i.qty) + "</span></div>";
            }).join("");
            rows += t.hasPrint
                ? '<div class="co-item-line"><span>Shipping</span><span class="amt">' + (t.ship === 0 ? "FREE" : fmtMoney(t.ship)) + "</span></div>"
                : "";
            rows += '<div class="co-item-line" style="border-top:1px dashed var(--line);margin-top:8px;padding-top:12px;font-weight:700;color:#fff"><span>Total</span><span class="amt">' + fmtMoney(t.total) + "</span></div>";
            modal.innerHTML = rows || '<div class="co-item-line">Your cart is empty.</div>';
        }
    }

    function startCheckout(mode) {
        checkoutMode = mode;
        checkoutPlan = null;
        // reset state
        document.querySelectorAll("#checkoutModal .co-panel").forEach(function (p, i) {
            p.style.display = i === 0 ? "block" : "none";
        });
        setCoStep(1);
        // show/hide shipping block
        var shipBlock = document.getElementById("coShipBlock");
        var needsShip = (mode === "books" && cartTotals().hasPrint);
        if (shipBlock) shipBlock.style.display = needsShip ? "block" : "none";
        coLines();
        new bootstrap.Modal(document.getElementById("checkoutModal")).show();
    }

    function startPlanCheckout(planId) {
        checkoutPlan = planId;
        startCheckout("mentorship");
    }

    function setCoStep(n) {
        document.querySelectorAll(".co-step").forEach(function (s) {
            var i = parseInt(s.getAttribute("data-step"), 10);
            s.classList.toggle("active", i === n);
            s.classList.toggle("done", i < n);
        });
    }

    function coGoStep(n) {
        document.querySelectorAll("#checkoutModal .co-panel").forEach(function (p) {
            p.style.display = "none";
        });
        var target = document.getElementById("coStep" + n);
        if (target) target.style.display = "block";
        setCoStep(n);
    }

    function initCheckout() {
        var modalEl = document.getElementById("checkoutModal");
        if (!modalEl) return;

        document.querySelectorAll("[data-plan-checkout]").forEach(function (b) {
            b.addEventListener("click", function () { startPlanCheckout(b.getAttribute("data-plan-checkout")); });
        });

        // payment tabs
        modalEl.querySelectorAll(".pay-tab").forEach(function (tab) {
            tab.addEventListener("click", function () {
                modalEl.querySelectorAll(".pay-tab").forEach(function (t) { t.classList.remove("active"); });
                modalEl.querySelectorAll(".pay-panel").forEach(function (p) { p.classList.remove("active"); });
                tab.classList.add("active");
                var panel = document.getElementById("payPanel" + tab.getAttribute("data-panel"));
                if (panel) panel.classList.add("active");
            });
        });

        // card number visual
        var cardNum = document.getElementById("cardNumber");
        if (cardNum) {
            cardNum.addEventListener("input", function () {
                var v = cardNum.value.replace(/\D/g, "").slice(0, 16);
                cardNum.value = v.replace(/(.{4})/g, "$1 ").trim();
                var vis = document.getElementById("cvNum");
                if (vis) vis.textContent = (cardNum.value || "4242 4242 4242 4242");
            });
        }

        // step 1 -> 2
        var detailsBtn = document.getElementById("coDetailsNext");
        if (detailsBtn) detailsBtn.addEventListener("click", function () {
            var email = document.getElementById("coEmail");
            if (!email || !email.value || email.value.indexOf("@") < 0) {
                email.focus();
                email.style.borderColor = "var(--loss)";
                return;
            }
            email.style.borderColor = "";
            coGoStep(2);
        });

        // back
        document.querySelectorAll("[data-co-back]").forEach(function (b) {
            b.addEventListener("click", function () {
                var s = parseInt(b.getAttribute("data-co-back"), 10);
                coGoStep(s);
            });
        });

        // pay
        var payBtn = document.getElementById("coPayBtn");
        if (payBtn) payBtn.addEventListener("click", function () {
            payBtn.disabled = true;
            payBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processing securely…';
            setTimeout(function () {
                coGoStep(3);
                renderSuccess();
                payBtn.disabled = false;
                payBtn.innerHTML = '<i class="fa fa-lock me-2"></i>Pay Now';
            }, 1900);
        });

        // close resets
        modalEl.addEventListener("hidden.bs.modal", function () {
            var payBtn2 = document.getElementById("coPayBtn");
            if (payBtn2) { payBtn2.disabled = false; payBtn2.innerHTML = '<i class="fa fa-lock me-2"></i>Pay Now'; }
        });
    }

    function renderSuccess() {
        var box = document.getElementById("coSuccessBody");
        if (!box) return;
        var html = '<div class="success-box">';
        if (checkoutMode === "mentorship" && checkoutPlan) {
            var p = PLANS[checkoutPlan];
            var email = (document.getElementById("coEmail") || {}).value || "your-email@example.com";
            // simulate membership provisioning
            try {
                localStorage.setItem("twj_auth", JSON.stringify({
                    email: email,
                    plan: p.name,
                    since: new Date().toISOString().slice(0, 10),
                    renews: new Date(Date.now() + p.months * 30.4 * 864e5).toISOString().slice(0, 10)
                }));
            } catch (e) {}
            html =
                '<div class="success-ico"><i class="fa fa-check"></i></div>' +
                "<h4>Welcome to the Inner Circle</h4>" +
                '<p class="sub">Your <b style="color:var(--primary)">' + p.name + "</b> membership is active. " +
                "A receipt was sent to <b>" + email + "</b>. Your private community invite is ready below — members only.</p>" +
                '<a class="tg-card" href="https://t.me/tradewithjoreem" target="_blank" rel="noopener">' +
                '<i class="fab fa-telegram"></i>' +
                "<span><span class='t'>Open the Private Telegram</span><br><span class='s'>Auto-invite for verified members</span></span>" +
                "</a>" +
                '<a class="tg-card" href="https://discord.gg/tradewithjoreem" target="_blank" rel="noopener">' +
                '<i class="fab fa-discord"></i>' +
                "<span><span class='t'>Join the Discord Desk</span><br><span class='s'>Live breakdowns &amp; study rooms</span></span>" +
                "</a>" +
                '<a href="member.html" class="btn btn-primary w-100 py-3 mt-2"><i class="fa fa-chart-line me-2"></i>Go to My Dashboard</a>';
        } else {
            var downloads = cart.filter(function (i) {
                var p = CATALOG[i.id];
                return p.type === "digital" || p.type === "bundle";
            });
            var hasPrint = cartTotals().hasPrint;
            html = '<div class="success-ico"><i class="fa fa-check"></i></div>' +
                "<h4>Order Confirmed</h4>" +
                '<p class="sub">Thank you for your purchase. ' +
                (hasPrint ? "Your print books are being prepared and will ship within 2 business days. " : "") +
                "Your receipts are on the way.</p>";
            if (downloads.length) {
                html += '<div class="dl-card" style="cursor:default"><i class="fa fa-file-pdf"></i>' +
                    "<span><span class='t'>Instant Downloads</span><br><span class='s'>Also sent to your email</span></span></div>";
                downloads.forEach(function (i) {
                    var p = CATALOG[i.id];
                    if (p.type === "bundle") {
                        ["crypto-signals", "stocks-zero"].forEach(function (bid) {
                            var bp = CATALOG[bid];
                            html += '<a class="dl-card" href="' + bp.file + '" download>' +
                                '<i class="fa fa-download"></i>' +
                                "<span><span class='t'>" + bp.title + " (PDF)</span><br><span class='s'>Download now</span></span></a>";
                        });
                        html += '<p style="font-size:12.5px;color:var(--muted)"><i class="fa fa-truck text-primary me-1"></i>Your 2 print books (Forex Mastery, Trading Psychology) will be couriered to your address.</p>';
                    } else {
                        html += '<a class="dl-card" href="' + p.file + '" download>' +
                            '<i class="fa fa-download"></i>' +
                            "<span><span class='t'>" + p.title + " (PDF)</span><br><span class='s'>Download now</span></span></a>";
                    }
                });
            }
            html += '<button class="btn btn-dark w-100 py-3 mt-2" id="coCloseSuccess">Continue Browsing</button>';
        }
        html += '</div>';
        box.innerHTML = html;
        var c = document.getElementById("coCloseSuccess");
        if (c) c.addEventListener("click", function () { bootstrap.Modal.getInstance(document.getElementById("checkoutModal")).hide(); });
    }

    /* ================= Member auth (demo) ================= */
    function getAuth() {
        try { return JSON.parse(localStorage.getItem("twj_auth") || "null"); } catch (e) { return null; }
    }

    function initAuth() {
        var loginForm = document.getElementById("loginForm");
        if (loginForm) {
            loginForm.addEventListener("submit", function (e) {
                e.preventDefault();
                var email = document.getElementById("loginEmail").value.trim();
                var pass = document.getElementById("loginPass").value;
                var err = document.getElementById("loginErr");
                if (!email || email.indexOf("@") < 0) {
                    err.style.display = "block";
                    err.textContent = "Please enter a valid email address.";
                    return;
                }
                if (pass.length < 6) {
                    err.style.display = "block";
                    err.textContent = "Password must be at least 6 characters.";
                    return;
                }
                err.style.display = "none";
                var btn = document.getElementById("loginBtn");
                btn.disabled = true;
                btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Verifying…';
                setTimeout(function () {
                    var auth = {
                        email: email,
                        plan: "Pro Trader — Annual",
                        since: new Date().toISOString().slice(0, 10),
                        renews: new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10)
                    };
                    localStorage.setItem("twj_auth", JSON.stringify(auth));
                    window.location.href = "member.html";
                }, 1100);
            });
        }

        var memberPage = document.getElementById("memberArea");
        if (memberPage) {
            var auth = getAuth();
            if (!auth) {
                window.location.replace("login.html");
                return;
            }
            var name = auth.email.split("@")[0].replace(/[._]/g, " ");
            name = name.replace(/\b\w/g, function (c) { return c.toUpperCase(); });
            document.getElementById("dashName").textContent = name;
            document.getElementById("dashMail").textContent = auth.email;
            document.getElementById("dashPlan").textContent = auth.plan;
            document.getElementById("dashRenew").textContent = auth.renews;
            var avatar = document.getElementById("dashAvatar");
            avatar.textContent = name.split(" ").map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase();
            // animate progress bars
            setTimeout(function () {
                document.querySelectorAll(".progress-bar[data-w]").forEach(function (b) {
                    b.style.width = b.getAttribute("data-w") + "%";
                });
            }, 300);
        }

        var logoutBtn = document.getElementById("dashLogout");
        if (logoutBtn) logoutBtn.addEventListener("click", function () {
            localStorage.removeItem("twj_auth");
            window.location.href = "login.html";
        });
    }

    /* ================= Contact form (demo) ================= */
    function initContact() {
        var f = document.getElementById("contactForm");
        if (!f) return;
        f.addEventListener("submit", function (e) {
            e.preventDefault();
            var btn = document.getElementById("contactBtn");
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Sending…';
            setTimeout(function () {
                f.innerHTML =
                    '<div class="text-center py-5">' +
                    '<div class="success-ico"><i class="fa fa-paper-plane"></i></div>' +
                    "<h4 class='mb-2' style='color:#fff'>Message Sent</h4>" +
                    "<p style='color:var(--muted);font-size:14px'>Thanks for reaching out — Joreem's team replies within 24 hours (Mon–Sat).</p>" +
                    "</div>";
            }, 1200);
        });
    }

    /* ================= Boot ================= */
    document.addEventListener("DOMContentLoaded", function () {
        initTicker();
        initTerminal();
        initCart();
        initCheckout();
        initAuth();
        initContact();
    });
})();
