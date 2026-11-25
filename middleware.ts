import { NextRequest, NextResponse } from 'next/server';

const legacyPages: Record<string, string> = {
  '/': '/legacy-site/index.html',
  '/about': '/legacy-site/about.html',
  '/bookstore': '/legacy-site/bookstore.html',
  '/contact': '/legacy-site/contact.html',
  '/mentorship': '/legacy-site/mentorship.html',
  '/member': '/legacy-site/member.html',
  '/login': '/legacy-site/login.html',
  '/privacy': '/legacy-site/privacy.html',
  '/risk': '/legacy-site/risk.html',
  '/terms': '/legacy-site/terms.html',
  '/thank-you': '/legacy-site/thank-you.html',
};

export function middleware(request: NextRequest) {
  const target = legacyPages[request.nextUrl.pathname];
  if (!target) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = target;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
