# Google Sheets Web App setup (Render frontend)

This project uses a deployed Google Apps Script Web App as its form/data endpoint. Google Sheets is the system of record. No SQL database, ORM, Supabase account database, or local data file is used.

## Apps Script code

In the Google Sheet, open **Extensions → Apps Script**, replace the editor contents with this code, save, then deploy it as a Web App. It exposes only `Books` and `PublicContent` for reads; form submissions are append-only. Private sheets are never returned by `doGet`.

```javascript
const PUBLIC_READ_SHEETS = new Set(['Books', 'Plans', 'PublicContent']);
const FORM_WRITE_SHEETS = new Set(['ContactRequests', 'Newsletter', 'AccessRequests', 'JournalEntries']);
const TIMEZONE = 'Etc/UTC';

function doGet(e) {
  const sheetName = String((e && e.parameter && e.parameter.sheet) || '');
  if (!PUBLIC_READ_SHEETS.has(sheetName)) return json_({ ok: false, error: 'Sheet is not publicly readable.' }, 403);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return json_([]);
  const values = sheet.getDataRange().getDisplayValues();
  const headers = values.shift().map(String);
  const rows = values.filter(row => row.some(value => value !== '')).map(row => {
    const object = {};
    headers.forEach((header, index) => { if (header) object[header] = row[index] || ''; });
    return object;
  });
  return json_(rows);
}

function doPost(e) {
  const parameters = (e && e.parameter) || {};
  const action = String(parameters.action || 'append');
  let rows;
  try {
    rows = JSON.parse((e && e.postData && e.postData.contents) || 'null');
  } catch (_) {
    return json_({ ok: false, error: 'Body must be valid JSON.' }, 400);
  }
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 100 || rows.some(row => !row || typeof row !== 'object' || Array.isArray(row))) {
    return json_({ ok: false, error: 'Body must be a JSON array of row objects (maximum 100).' }, 400);
  }

  if (action === 'verifiedStripe') return recordVerifiedStripe_(rows);
  if (action === 'createDoc' || action === 'createSlides') return createGoogleFile_(action, rows);

  const sheetName = String(parameters.sheet || '');
  if (!FORM_WRITE_SHEETS.has(sheetName)) return json_({ ok: false, error: 'Sheet is not enabled for form submissions.' }, 403);
  const cleanRows = rows.map(row => cleanRow_(row));
  const result = appendRows_(sheetName, cleanRows);
  return json_({ ok: true, count: result.count });
}

function recordVerifiedStripe_(rows) {
  const expectedSecret = PropertiesService.getScriptProperties().getProperty('TWJ_STRIPE_WEBHOOK_SECRET');
  if (!expectedSecret) return json_({ ok: false, error: 'Stripe forwarding secret is not configured.' }, 503);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    let recorded = 0;
    rows.forEach(input => {
      if (!input._webhook_secret || input._webhook_secret !== expectedSecret) throw new Error('Invalid webhook forwarding secret.');
      const row = cleanRow_(input);
      delete row._webhook_secret;
      if (!row.event_id || alreadyRecorded_(String(row.event_id))) return;
      appendRows_('StripeEvents', [row]);
      recorded++;
      if ((row.event_type === 'checkout.session.completed' || row.event_type === 'checkout.session.async_payment_succeeded') && ['paid', 'no_payment_required'].includes(String(row.payment_status)) && row.customer_email && row.object_id) {
        appendRows_('Orders', [{
          event_id: row.event_id,
          checkout_session_id: row.object_id,
          submitted_at: row.received_at || new Date().toISOString(),
          customer_email: row.customer_email,
          sku_list: row.sku_list || '',
          payment_status: row.payment_status || '',
          amount_total_minor: row.amount_total || 0,
          currency: row.currency || '',
          stripe_customer_id: row.stripe_customer_id || '',
          stripe_subscription_id: row.stripe_subscription_id || '',
          promo_code: row.promo_code || '',
          checkout_mode: row.mode || ''
        }]);
      }
    });
    return json_({ ok: true, count: recorded });
  } catch (error) {
    return json_({ ok: false, error: String(error && error.message || 'Could not record Stripe event.') }, 403);
  } finally {
    lock.releaseLock();
  }
}

function alreadyRecorded_(eventId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('StripeEvents');
  if (!sheet || sheet.getLastRow() < 2) return false;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  const column = headers.indexOf('event_id') + 1;
  if (!column) return false;
  return sheet.getRange(2, column, sheet.getLastRow() - 1, 1).createTextFinder(eventId).matchEntireCell(true).findNext() !== null;
}

function createGoogleFile_(action, rows) {
  const expectedToken = PropertiesService.getScriptProperties().getProperty('TWJ_AUTOMATION_TOKEN');
  if (!expectedToken) return json_({ ok: false, error: 'Document automation is not configured.' }, 503);
  const ids = [];
  try {
    rows.forEach(row => {
      if (!row._automation_token || row._automation_token !== expectedToken) throw new Error('Invalid document automation token.');
      const title = safeText_(row.title || (action === 'createDoc' ? 'Trade with Joreem document' : 'Trade with Joreem slides'), 180);
      const body = safeText_(row.body || '', 40000);
      if (action === 'createDoc') {
        const doc = DocumentApp.create(title);
        doc.getBody().setText(body);
        doc.saveAndClose();
        ids.push(doc.getId());
      } else {
        const deck = SlidesApp.create(title);
        const slide = deck.getSlides()[0] || deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
        slide.insertTextBox(body || title, 48, 90, 620, 300);
        ids.push(deck.getId());
      }
    });
    return json_({ ok: true, ids: ids });
  } catch (error) {
    return json_({ ok: false, error: String(error && error.message || 'Could not create Google file.') }, 403);
  }
}

function appendRows_(sheetName, rows) {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = book.getSheetByName(sheetName) || book.insertSheet(sheetName);
  const existingHeaders = sheet.getLastColumn() ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].filter(Boolean) : [];
  const newHeaders = [];
  rows.forEach(row => Object.keys(row).forEach(key => { if (!existingHeaders.includes(key) && !newHeaders.includes(key)) newHeaders.push(key); }));
  const headers = existingHeaders.concat(newHeaders);
  if (!headers.length) throw new Error('No sheet columns were provided.');
  if (newHeaders.length) sheet.getRange(1, existingHeaders.length + 1, 1, newHeaders.length).setValues([newHeaders]);
  if (sheet.getFrozenRows() === 0) sheet.setFrozenRows(1);
  const values = rows.map(row => headers.map(header => safeCell_(row[header])));
  sheet.getRange(sheet.getLastRow() + 1, 1, values.length, headers.length).setValues(values);
  return { count: values.length };
}

function cleanRow_(input) {
  const row = {};
  Object.keys(input).forEach(key => {
    if (key.startsWith('_')) { row[key] = input[key]; return; }
    row[safeText_(key, 80)] = input[key] == null ? '' : input[key];
  });
  if (!row.submitted_at && !row.received_at) row.submitted_at = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss'Z'");
  return row;
}

function safeCell_(value) {
  if (value == null) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  const text = String(value).slice(0, 50000);
  return /^[\s]*[=+@\-\t\r]/.test(text) ? "'" + text : text;
}
function safeText_(value, max) { return String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max); }
function json_(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
```

## Deploy and configure

1. In **Apps Script → Project Settings → Script Properties**, add `TWJ_STRIPE_WEBHOOK_SECRET` with a long random value. Add `TWJ_AUTOMATION_TOKEN` only if a trusted server-side tool will create Docs/Slides; never put it in browser code.
2. Create a `Books` tab with header columns `id`, `title`, `desc`, `price`, `kind`, `image`, `active`. Create a `Plans` tab with `id`, `name`, `blurb`, `monthly`, `annual`, `featured`, `active`, `feature_1`, `feature_2`, `feature_3`, `feature_4`, `feature_5`, `feature_6`. Use `TRUE`/`FALSE` for flags. Keep the checkout SKU IDs exactly `foundation`, `pro`, `elite`; Stripe still validates the real amount at payment time. Use public HTTPS URLs or same-site paths for book images. Add `PublicContent` only for content you intentionally make public. Seed the public catalog with rows matching the headers; for `Books`, use the IDs `forex-mastery`, `crypto-signals`, `trading-psychology`, `stocks-from-zero`, and `bundle`. For `Plans`, seed the `foundation`, `pro`, and `elite` IDs and their approved monthly/annual prices/features. These rows are the public display source; the configured Stripe Price IDs remain authoritative for charged amounts.
3. In **Deploy → New deployment → Web app**, execute as **you**. For a public website form, set access to **Anyone**. Copy the deployed URL ending in `/exec` (not `/dev`). Anyone with the URL can submit to the allowlisted form tabs; do not make private tabs readable. Protect the spreadsheet and restrict editor access. Add rate limiting/abuse protection before collecting real personal data.
4. In Render environment variables, set both `NEXT_PUBLIC_GOOGLE_SCRIPT_WEBAPP_URL` and `GOOGLE_SCRIPT_WEBAPP_URL` to that same `/exec` URL. Set `GOOGLE_SCRIPT_WEBHOOK_SECRET` to the same value as `TWJ_STRIPE_WEBHOOK_SECRET`; this value is server-side only.
5. When using Stripe, keep `STRIPE_WEBHOOK_SECRET` set in Render. Stripe posts to the Next route `/api/webhooks/stripe`; Next verifies Stripe's signature first, then forwards verified event rows to Apps Script. Never point Stripe directly at a public, unsigned Sheets append endpoint.
6. Re-deploy the frontend after changing its public URL variable. Test `/bookstore` reads `Books`, and submit a test contact/newsletter/access request. Verify rows are appended in their named tabs. Test `StripeEvents` with Stripe test mode before enabling live payments.
7. Do not enable membership, print or digital checkout until member authentication, protected file delivery, email and fulfilment are independently secured and operational. Google Sheets is not a per-user authorization system.

## Data contract

Frontend write requests are JSON arrays of objects; each object's properties become sheet column headers. Current form tabs are `ContactRequests`, `Newsletter`, `AccessRequests`, and `JournalEntries`. `doGet` returns a standard JSON array of objects keyed by the header row. Only `Books`, `Plans` and `PublicContent` are readable from the public web app. Successful checkout events are recorded in restricted `StripeEvents` and `Orders` tabs after Stripe signature verification.

The browser sends `Content-Type: text/plain;charset=utf-8` to avoid a JSON preflight. Apps Script Web Apps have Google-controlled redirects and browser cross-origin behavior can vary. Test the deployed `/exec` URL from the actual Render origin; if the browser blocks reading its response, do not silently switch to opaque `no-cors` success claims. Use a controlled CORS-capable relay or a Google-supported integration instead.


## Optional server-side Docs / Slides calls

The web app accepts authenticated automation actions for creating a Google Doc or presentation. Call these from a trusted server process only (not from browser code) using the `TWJ_AUTOMATION_TOKEN` Script Property:

```js
const url = new URL(process.env.GOOGLE_SCRIPT_WEBAPP_URL);
url.searchParams.set('action', 'createDoc'); // or 'createSlides'
const response = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
  body: JSON.stringify([{ title: 'Session notes', body: 'Approved content goes here.', _automation_token: process.env.GOOGLE_SCRIPT_AUTOMATION_TOKEN }])
});
const result = await response.json(); // { ok: true, ids: [Google file ID] }
```

Set `GOOGLE_SCRIPT_AUTOMATION_TOKEN` as a server-only Render environment variable equal to `TWJ_AUTOMATION_TOKEN`. The token is deliberately not included in any frontend bundle or sample client form. The Apps Script creates the file in the executing Google account's Drive.
