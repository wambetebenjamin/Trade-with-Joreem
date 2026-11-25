import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isSameOrigin } from '@/lib/request-security';

const formSchema = z.object({
  sheet: z.enum(['ContactRequests', 'Newsletter', 'AccessRequests']),
  row: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).refine((row) => Object.keys(row).length > 0),
});

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ ok: false, error: 'Request origin could not be verified.' }, { status: 403 });
  const parsed = formSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Please check the form fields and try again.' }, { status: 400 });

  const endpoint = process.env.GOOGLE_SCRIPT_WEBAPP_URL || process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_WEBAPP_URL;
  if (!endpoint || endpoint === 'GOOGLE_SCRIPT_WEBAPP_URL') return NextResponse.json({ ok: false, error: 'Form submissions are not configured yet.' }, { status: 503 });

  try {
    const url = new URL(endpoint);
    url.searchParams.set('sheet', parsed.data.sheet);
    url.searchParams.set('action', 'append');
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8', Accept: 'application/json' },
      body: JSON.stringify([{ ...parsed.data.row, submitted_at: parsed.data.row.submitted_at || new Date().toISOString() }]),
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
    });
    const result: unknown = await upstream.json().catch(() => null);
    if (!upstream.ok || !result || typeof result !== 'object' || !('ok' in result) || result.ok !== true) {
      return NextResponse.json({ ok: false, error: 'The form service did not accept the submission. Please try again.' }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'The form service is temporarily unavailable. Please try again.' }, { status: 502 });
  }
}
