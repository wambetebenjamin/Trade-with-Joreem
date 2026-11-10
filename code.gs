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
