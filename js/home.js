/********** Trade with Joreem — Homepage widgets (index only) **********/
(function () {
    "use strict";

    /* ================= Discord community feed ================= */
    var COUNTRIES = ["Kenya", "Nigeria", "Ghana", "Uganda", "Tanzania", "United States", "United Kingdom", "South Africa", "Canada", "Germany"];
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
        "Journal reviews are out. Check <span class='gold'>#trade-reviews</span>.",
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
            '<div class="av ' + (o.mentor ? "" : "member") + '">' + (o.mentor ? '<i class="fa fa-user-tie"></i>' : '<i class="fa fa-user"></i>') + "</div>" +
            '<div><div class="meta"><b>' + o.who + "</b> " + (o.mentor ? '<span class="gold">MENTOR</span> ' : "SAMPLE ") + "\u2022 " + o.time + "</div>" +
            '<div class="txt">' + o.txt + "</div></div></div>";
    }

    function initDiscordFeed() {
        var feed = document.getElementById("dwFeed");
        if (!feed) return;
        var msgs = [
            { who: "Member", time: stamp(), txt: "A student from " + COUNTRIES[0] + " just logged <b>+2.1R</b> on EUR/USD!" },
            { who: "Member", time: stamp(), txt: "A student from " + COUNTRIES[1] + " hit their <b>first green month</b>!" },
            { who: "Joreem", mentor: true, time: stamp(), txt: "Today's New York breakdown starts in 1 hour. Bring your levels." },
            { who: "Member", time: stamp(), txt: "A student from " + COUNTRIES[2] + " passed their <b>phase 2 review</b>!" }
        ];
        feed.innerHTML = msgs.map(msgHTML).join("");

        var wi = 0, mi = 0;
        setInterval(function () {
            var isMentor = (mi < 2) && Math.random() < 0.22;
            var m;
            if (isMentor) {
                m = { who: "Joreem", mentor: true, time: stamp(), txt: MENTOR_POOL[mi++ % MENTOR_POOL.length] };
            } else {
                var country = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
                m = { who: "Member", time: stamp(), txt: "A student from " + country + " " + WIN_POOL[wi++ % WIN_POOL.length] };
            }
            feed.insertAdjacentHTML("afterbegin", msgHTML(m));
            var nodes = feed.querySelectorAll(".dw-msg");
            if (nodes.length > 6) nodes[nodes.length - 1].remove();
        }, 4200);
    }

    /* ================= Boot ================= */
    document.addEventListener("DOMContentLoaded", function () {
        initDiscordFeed();
    });
})();
