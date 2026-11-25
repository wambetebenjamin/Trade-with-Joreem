import 'server-only';

export async function writeVerifiedSheetRows(sheet: string, rows: Record<string, unknown>[], action = 'verifiedStripe') {
  const endpoint = process.env.GOOGLE_SCRIPT_WEBAPP_URL || process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_WEBAPP_URL;
  const secret = process.env.GOOGLE_SCRIPT_WEBHOOK_SECRET;
  if (!endpoint || endpoint === 'GOOGLE_SCRIPT_WEBAPP_URL' || !secret) throw new Error('Google Apps Script webhook forwarding is not configured.');
  const url = new URL(endpoint); url.searchParams.set('sheet', sheet); url.searchParams.set('action', action);
  const response = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8', Accept: 'application/json' },
    body: JSON.stringify(rows.map((row) => ({ ...row, _webhook_secret: secret }))), cache: 'no-store',
  });
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok || !result || typeof result !== 'object' || !('ok' in result) || result.ok !== true) throw new Error('Google Apps Script rejected the verified event.');
}
