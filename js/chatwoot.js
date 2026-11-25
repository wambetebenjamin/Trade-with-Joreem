/* Human-led support chat. No third-party script loads until configured. */
(function () {
    "use strict";

    var config = window.TWJ_CHATWOOT || {};
    var token = typeof config.websiteToken === "string" ? config.websiteToken.trim() : "";
    var baseUrl = typeof config.baseUrl === "string" ? config.baseUrl.trim() : "";
    if (!token || !baseUrl) return;

    var parsedUrl;
    try {
        parsedUrl = new URL(baseUrl);
    } catch (error) {
        console.error("Chatwoot is not loaded: configure a valid baseUrl in js/chatwoot-config.js.");
        return;
    }

    if (parsedUrl.protocol !== "https:" && parsedUrl.hostname !== "localhost") {
        console.error("Chatwoot is not loaded: the baseUrl must use HTTPS.");
        return;
    }

    baseUrl = parsedUrl.origin;
    window.chatwootSettings = {
        hideMessageBubble: false,
        position: "right",
        type: "standard",
        locale: "en",
        darkMode: "light",
        welcomeHeading: "Need help with your learning?",
        welcomeTagline: "Chat with our team. Replies are from a person."
    };

    var sdk = document.createElement("script");
    sdk.src = baseUrl + "/packs/js/sdk.js";
    sdk.async = true;
    sdk.onload = function () {
        if (window.chatwootSDK && typeof window.chatwootSDK.run === "function") {
            window.chatwootSDK.run({ websiteToken: token, baseUrl: baseUrl });
        }
    };
    sdk.onerror = function () {
        console.error("Chatwoot support could not be loaded.");
    };
    document.head.appendChild(sdk);
})();
