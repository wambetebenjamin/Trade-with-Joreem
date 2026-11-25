'use client';
import { useState } from 'react';
import { submitSheetRows } from '@/lib/google-script';
export function JournalForm() {
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form)); setBusy(true); setMessage(''); setError(false);
    try {
      await submitSheetRows('JournalEntries', [{
        submitted_at: new Date().toISOString(), title: String(values.title || '').trim(), market: String(values.market || '').trim(),
        trade_date: String(values.tradeDate || ''), notes: String(values.notes || '').trim(),
      }]);
      form.reset(); setMessage('Journal entry submitted to the connected Google Sheet. This sheet is not private; avoid entering sensitive information.');
    } catch (cause) { setError(true); setMessage(cause instanceof Error ? cause.message : 'Could not submit journal entry.'); }
    finally { setBusy(false); }
  }
  return <form className="form" onSubmit={submit}>
    <label>Entry title<input name="title" required minLength={2} maxLength={120}/></label>
    <label>Market<input name="market" placeholder="EUR/USD, BTC/USD…" maxLength={32}/></label>
    <label>Date<input name="tradeDate" type="date"/></label>
    <label>What did you observe or learn?<textarea name="notes" rows={5} required minLength={5} maxLength={4000}/></label>
    <button className="button" disabled={busy}>{busy?'Submitting…':'Submit journal entry'}</button>
    {message&&<p role="status" className={error?'error':'muted'}>{message}</p>}
  </form>;
}
