import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { connection } from "next/server";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { CmsRouteSwitch } from "@/components/cms/CmsPublishedRoute";
import { SiteSettingsProvider } from "@/components/cms/SiteSettings";
import { apiBaseUrl } from "@/lib/api/client";
import { cmsMediaUrl } from "@/lib/cms/media";
import { AnalyticsTracker } from "@/components/analytics/AnalyticsTracker";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const defaultMetadata: Metadata = {
  title: "Institute of Directors–Ghana | Advancing Directors",
  description: "IoD-Gh is Ghana's professional community for directors and governance leaders.",
};

export async function generateMetadata(): Promise<Metadata> {
  try {
    const response = await fetch(apiBaseUrl + "/api/v2/cms/site/", { cache: "no-store" });
    const { settings } = await response.json();
    const favicon = cmsMediaUrl(settings, "favicon");
    return { ...defaultMetadata, ...(settings.website_name ? { title: settings.website_name } : {}), ...(favicon ? { icons: { icon: favicon } } : {}) };
  } catch { return defaultMetadata; }
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Each document must be rendered with its own CSP nonce, never a cached one.
  await connection();
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen">
        <SiteSettingsProvider>
        <Header />
        <CmsRouteSwitch>{children}</CmsRouteSwitch>
        <Footer />
        <AnalyticsTracker />
        </SiteSettingsProvider>
      </body>
    </html>
  );
}
