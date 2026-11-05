(function () {
    "use strict";
    var STORAGE_KEY = "twj_analytics_consent";
    var analyticsLoaded = false;

    function loadAnalytics() {
        if (analyticsLoaded) return;
        analyticsLoaded = true;
        var script = document.createElement("script");
        script.defer = true;
        script.src = "/_vercel/insights/script.js";
        script.onerror = function () {
            analyticsLoaded = false;
            console.warn("Vercel Web Analytics is not enabled for this deployment yet.");
        };
        document.head.appendChild(script);
    }

    function init() {
        var banner = document.createElement("section");
        banner.className = "site-consent-banner";
        banner.setAttribute("role", "dialog");
        banner.setAttribute("aria-label", "Optional analytics preferences");
        banner.setAttribute("aria-describedby", "siteConsentCopy");
        banner.innerHTML =
            '<p class="site-consent-copy" id="siteConsentCopy">Allow optional website analytics to help us improve the site? Your choice is stored on this device. <a href="/privacy.html#cookies">Privacy details</a>.</p>' +
            '<div class="site-consent-actions">' +
            '<button type="button" data-consent="reject">Reject analytics</button>' +
            '<button type="button" data-consent="accept">Allow analytics</button>' +
            '</div>';
        document.body.appendChild(banner);

        var choice = null;
        try { choice = localStorage.getItem(STORAGE_KEY); } catch (_) {}
        if (choice === "accepted" || choice === "rejected") {
            banner.hidden = true;
            if (choice === "accepted") loadAnalytics();
            return;
        }

        banner.addEventListener("click", function (event) {
            var button = event.target.closest("button[data-consent]");
            if (!button) return;
            var accepted = button.getAttribute("data-consent") === "accept";
            try { localStorage.setItem(STORAGE_KEY, accepted ? "accepted" : "rejected"); } catch (_) {}
            banner.hidden = true;
            if (accepted) loadAnalytics();
        });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
    else init();
})();
