'use client';
import { useState } from 'react';
import { submitSheetRows } from '@/lib/google-script';

export function ContactForm() {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; setBusy(true); setMessage(''); setError(false);
    const formData = Object.fromEntries(new FormData(form));
    if (formData.company) { form.reset(); setMessage('Thanks. Your message has been received.'); setBusy(false); return; }
    try {
      await submitSheetRows('ContactRequests', [{
        submitted_at: new Date().toISOString(), name: String(formData.name || '').trim(), email: String(formData.email || '').trim(),
        topic: String(formData.topic || 'General question'), phone: String(formData.phone || '').trim(), message: String(formData.message || '').trim(),
      }]);
      form.reset(); setMessage('Thanks. Your message has been received.');
    } catch (cause) { setError(true); setMessage(cause instanceof Error ? cause.message : 'Could not send your message.'); }
    finally { setBusy(false); }
  }
  return <form className="form" onSubmit={submit}>
    <label>Name<input required name="name" minLength={2} maxLength={100}/></label>
    <label>Email<input required type="email" name="email" maxLength={254}/></label>
    <label>Topic<select name="topic"><option>General question</option><option>Mentorship</option><option>Book order</option><option>Technical support</option></select></label>
    <label>Phone / WhatsApp (optional)<input name="phone" type="tel" maxLength={40}/></label>
    <label>Message<textarea required name="message" minLength={10} maxLength={3000} rows={6}/></label>
    <div style={{position:'absolute',left:'-9999px'}} aria-hidden="true"><label>Company<input tabIndex={-1} autoComplete="off" name="company"/></label></div>
    <button className="button" disabled={busy} aria-busy={busy}>{busy?'Sending…':'Send message'}</button>
    {message&&<p role="status" className={error?'error':'muted'}>{message}</p>}
  </form>;
}
