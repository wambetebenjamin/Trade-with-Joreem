'use client';

export type SheetRow = Record<string, string | number | boolean | null>;

const GOOGLE_SCRIPT_WEBAPP_URL =
  process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_WEBAPP_URL || 'GOOGLE_SCRIPT_WEBAPP_URL';

function endpoint(sheet: string, action = '') {
  if (!GOOGLE_SCRIPT_WEBAPP_URL || GOOGLE_SCRIPT_WEBAPP_URL === 'GOOGLE_SCRIPT_WEBAPP_URL') {
    throw new Error('Google Sheets is not configured yet. Set NEXT_PUBLIC_GOOGLE_SCRIPT_WEBAPP_URL.');
  }
  const url = new URL(GOOGLE_SCRIPT_WEBAPP_URL);
  url.searchParams.set('sheet', sheet);
  if (action) url.searchParams.set('action', action);
  return url.toString();
}

/** Writes one or more column-shaped objects directly to the Apps Script web app. */
export async function submitSheetRows<T extends SheetRow>(sheet: string, rows: T[], action = '') {
  if (!Array.isArray(rows) || rows.some((row) => !row || typeof row !== 'object' || Array.isArray(row))) {
    throw new Error('Submission must be a JSON array of sheet-row objects.');
  }
  const response = await fetch(endpoint(sheet, action), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8', Accept: 'application/json' },
    body: JSON.stringify(rows),
    cache: 'no-store',
  });
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok || !result || typeof result !== 'object' || !('ok' in result) || result.ok !== true) {
    const message = result && typeof result === 'object' && 'error' in result && typeof result.error === 'string'
      ? result.error : 'Google Sheets could not accept this submission. Please try again.';
    throw new Error(message);
  }
  return result as { ok: true; rows?: SheetRow[]; ids?: string[] };
}

/** Reads allowlisted public sheet rows as a standard JSON array of column-keyed objects. */
export async function getSheetRows<T extends SheetRow = SheetRow>(sheet: string): Promise<T[]> {
  const response = await fetch(endpoint(sheet), { headers: { Accept: 'application/json' }, cache: 'no-store' });
  if (!response.ok) throw new Error('Could not load sheet data.');
  const result: unknown = await response.json();
  if (!Array.isArray(result) || result.some((row) => !row || typeof row !== 'object' || Array.isArray(row))) {
    throw new Error('The Apps Script response must be a JSON array of row objects.');
  }
  return result as T[];
}
