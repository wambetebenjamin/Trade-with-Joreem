# Chatwoot support setup

The site includes a small, optional Chatwoot loader. It does not contact Chatwoot or load a third-party script while the configuration values are blank.

## Enable the widget

1. Create a Chatwoot workspace (Cloud or a self-hosted instance).
2. In Chatwoot, create a website inbox for the public website and copy its **Website Token**. Use the workspace's public site URL as the base URL (for example, `https://app.chatwoot.com` for Chatwoot Cloud, or your own HTTPS host).
3. Set `baseUrl` and `websiteToken` in `js/chatwoot-config.js`.
4. Deploy the site and test the widget on desktop and mobile, including a message sent while agents are offline.
5. Before enabling it for visitors, update the site's privacy notice to explain that support messages and contact details are processed by Chatwoot/the selected hosting provider. Configure retention, access controls, and agent availability in Chatwoot.

The Website Token is intended to be public in a website widget. Never place an account access token, service-role key, password, or other secret in this file.

## Human-led support

Keep replies human-led. The widget copy is configured to say that replies are from a person. Chatwoot's optional AI features are not required for this integration and should remain disabled unless the site owner explicitly chooses otherwise.

## Files

- `js/chatwoot-config.js` — public widget URL and Website Token.
- `js/chatwoot.js` — validates the configuration and loads the Chatwoot widget only when both values are present.

The widget is included on all site pages. With the default blank configuration, it makes no network request.
