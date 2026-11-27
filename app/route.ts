import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const html = await readFile(path.join(process.cwd(), 'dist', 'index.html'), 'utf8');

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
    },
  });
}
