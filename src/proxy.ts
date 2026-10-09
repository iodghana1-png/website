import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  const apiOrigin = new URL(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8010").origin;
  const devSocket = isDev ? ` ${request.nextUrl.origin.replace(/^http/, "ws")}` : "";
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "script-src-attr 'none'",
    // Existing CMS layouts and the rich-text editor use inline style attributes.
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' https: data: blob: ${apiOrigin}`,
    `media-src 'self' https: blob: ${apiOrigin}`,
    "font-src 'self' data:",
    `connect-src 'self' ${apiOrigin}${devSocket}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // Preserve the admin's same-origin draft preview iframe and permit the contact-page Google Maps embed.
    "frame-src 'self' https://www.google.com https://maps.google.com",
    "frame-ancestors 'self'",
  ].join("; ");
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", policy);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/((?!api/|_next/|favicon.ico|images/).*)"],
};
