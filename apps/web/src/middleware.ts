import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get("session_id")?.value;
  const isAuthPage = request.nextUrl.pathname.startsWith("/login");
  const isProtectedPage = request.nextUrl.pathname.startsWith("/wizard");

  // If user is on a protected page and not logged in, redirect to login
  if (isProtectedPage && !sessionToken) {
    const loginUrl = new URL("/login", request.url);
    // loginUrl.searchParams.set("from", request.nextUrl.pathname); // Optional: Redirect back after login
    return NextResponse.redirect(loginUrl);
  }

  // If user is already logged in and tries to go to login, redirect to wizard
  if (isAuthPage && sessionToken) {
    return NextResponse.redirect(new URL("/wizard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/wizard/:path*", "/login"],
};
