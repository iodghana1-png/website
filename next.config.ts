import type { NextConfig } from "next";

const cmsApiUrl = new URL(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8010");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] : []),
      ],
    }];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com", pathname: "/vi/**" },
      { protocol: "https", hostname: "api-production-54a4a.up.railway.app", pathname: "/api/v2/cms/media/**" },
      {
        protocol: cmsApiUrl.protocol.slice(0, -1) as "http" | "https",
        hostname: cmsApiUrl.hostname,
        port: cmsApiUrl.port,
        pathname: "/api/v2/cms/media/**",
      },
    ],
  },
  // Keep Turbopack scoped to this project even when parent folders contain locks.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
