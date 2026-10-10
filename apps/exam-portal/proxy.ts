import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  // The examination portal has no CMS routes. Send accidental admin visits to
  // the main IoD-Gh application, while retaining the exact CMS destination.
  if (request.nextUrl.pathname === "/admin" || request.nextUrl.pathname.startsWith("/admin/")) {
    const mainSite = new URL(process.env.NEXT_PUBLIC_MAIN_SITE_URL || "https://iodghana.org");
    return NextResponse.redirect(new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, mainSite), 307);
  }
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const dev = process.env.NODE_ENV === "development";
  const apiOrigin = new URL(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8010").origin;
  const policy = `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}; style-src 'self' 'nonce-${nonce}'; connect-src 'self' ${apiOrigin}${dev ? " ws://localhost:3001 ws://127.0.0.1:3001" : ""}; img-src 'self' data: ${apiOrigin}; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`;
  const headers = new Headers(request.headers);
  headers.set("Content-Security-Policy", policy);
  headers.set("x-nonce", nonce);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", policy);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
