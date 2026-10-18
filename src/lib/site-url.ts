const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://iodghana.org";

export const siteUrl = configuredSiteUrl.replace(/\/$/, "");

export function absoluteSiteUrl(path: string) {
  return new URL(path, siteUrl).toString();
}
