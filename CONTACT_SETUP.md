# Google Sheets contact and newsletter setup

The contact and newsletter forms post directly from the browser to the Google Apps Script Web App. They do not call a Next.js contact API, Resend, or another database service.

1. Follow `GOOGLE_APPS_SCRIPT_SETUP.md` and deploy the web app.
2. Set `NEXT_PUBLIC_GOOGLE_SCRIPT_WEBAPP_URL` to the deployed `/exec` URL in Render's environment variables, then redeploy the site.
3. Submit test data from the deployed Render origin and verify a row is appended to `ContactRequests` or `Newsletter` in the spreadsheet.
4. If the request errors, verify the web-app deployment access is **Anyone**, the URL ends in `/exec`, and the Apps Script execution logs show no authorization or quota error.

The deployed public endpoint accepts writes to the named tabs and is not an authenticated private API. Protect spreadsheet editor access, collect only necessary information, and configure bot/rate protection before production use. A success message appears only after the frontend receives a successful JSON response.
