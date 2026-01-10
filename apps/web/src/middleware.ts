import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // We're removing the sessionToken check from middleware because on Render, 
  // the backend session cookie is on a different subdomain and invisible to the frontend server-side.
  // Auth redirection is now handled client-side in the layouts/pages (e.g. /wizard, /profile).
  return NextResponse.next();
}

export const config = {
  matcher: ["/wizard/:path*", "/login"],
};
