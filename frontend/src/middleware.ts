// import { NextResponse } from 'next/server';
// import type { NextRequest } from 'next/server';

// const PUBLIC_PATHS = ['/login'];

// export function middleware(request: NextRequest) {
//   const { pathname } = request.nextUrl;

//   if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
//     return NextResponse.next();
//   }

//   const token = request.cookies.get('anomanet_token')?.value;

//   if (!token) {
//     const loginUrl = new URL('/login', request.url);
//     loginUrl.searchParams.set('redirect', pathname);
//     return NextResponse.redirect(loginUrl);
//   }

//   // Forward token to API routes
//   const response = NextResponse.next();
//   response.headers.set('x-auth-token', token);
//   return response;
// }

// export const config = {
//   matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
// };

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// DEV MODE — middleware disabled, all routes accessible without login.
// Re-enable JWT check once backend is connected.
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
