'use client';
import { useState } from 'react';
import { submitSheetRows } from '@/lib/google-script';
export function LoginForm() {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const email = String(new FormData(form).get('email') || '').trim(); setBusy(true); setMessage(''); setError(false);
    try { await submitSheetRows('AccessRequests', [{ submitted_at: new Date().toISOString(), email, request_type: 'member_access' }]); form.reset(); setMessage('Your access request has been submitted. This is a request only, not a sign-in or account.'); }
    catch (cause) { setError(true); setMessage(cause instanceof Error ? cause.message : 'Could not submit your request.'); }
    finally { setBusy(false); }
  }
  return <form className="form" onSubmit={submit}><label>Email<input required type="email" name="email" autoComplete="email" maxLength={254}/></label><button className="button" disabled={busy}>{busy?'Submitting…':'Request member access'}</button>{message&&<p role="status" className={error?'error':'notice'}>{message}</p>}</form>;
}
