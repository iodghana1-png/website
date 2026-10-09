import { apiBaseUrl } from "@/lib/api/client";

const mediaIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const safeUrlPattern = /^(https?:\/\/|\/(?!\/))/i;

/**
 * Build a deployment-independent URL for media selected in the CMS.
 *
 * Older settings revisions stored the browser URL at the time of selection,
 * which may be a local-development URL. The media UUID is the durable source
 * of truth, so it is always preferred when available.
 */
export function cmsMediaUrl(values: object, key: string): string {
  const data = values as Record<string, unknown>;
  const storedMediaId = data[`${key}_id`];
  const mediaId = typeof storedMediaId === "string" ? storedMediaId.trim() : "";
  if (mediaIdPattern.test(mediaId)) return `${apiBaseUrl}/api/v2/cms/media/${mediaId}/`;

  const storedUrl = data[`${key}_url`];
  const url = typeof storedUrl === "string" ? storedUrl.trim() : "";
  return safeUrlPattern.test(url) ? url : "";
}
