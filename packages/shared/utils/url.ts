export function setUrlHostnameFromResolvedAddress(url: URL, address: string) {
  url.hostname = address.includes(":") ? `[${address}]` : address;
}

const ALLOWED_BOOKMARK_URL_PROTOCOLS: readonly string[] = ["http:", "https:"];

const TRACKING_QUERY_PARAMS: ReadonlySet<string> = new Set([
  "_ga",
  "_gl",
  "dclid",
  "fbclid",
  "gclid",
  "igshid",
  "li_fat_id",
  "mc_cid",
  "mc_eid",
  "msclkid",
  "ttclid",
  "twclid",
  "yclid",
]);

function isTrackingQueryParam(name: string): boolean {
  const normalizedName = name.toLowerCase();
  return (
    normalizedName.startsWith("utm_") ||
    TRACKING_QUERY_PARAMS.has(normalizedName)
  );
}

/**
 * Removes known analytics and advertising parameters from a bookmark URL.
 * Unrecognized parameters are preserved because they may identify the resource.
 */
export function normalizeBookmarkUrl(url: string): string {
  const trimmedUrl = url.trim();
  // Validate the input while preserving its original representation below.
  new URL(trimmedUrl);

  const fragmentIndex = trimmedUrl.indexOf("#");
  const queryIndex = trimmedUrl.indexOf("?");
  if (
    queryIndex === -1 ||
    (fragmentIndex !== -1 && queryIndex > fragmentIndex)
  ) {
    return trimmedUrl;
  }

  const queryEnd = fragmentIndex === -1 ? trimmedUrl.length : fragmentIndex;
  const query = trimmedUrl.slice(queryIndex + 1, queryEnd);
  let changed = false;

  const remainingParams = query.split("&").filter((param) => {
    const separatorIndex = param.indexOf("=");
    const encodedName =
      separatorIndex === -1 ? param : param.slice(0, separatorIndex);

    let name: string;
    try {
      name = decodeURIComponent(encodedName.replace(/\+/g, " "));
    } catch {
      return true;
    }

    if (isTrackingQueryParam(name)) {
      changed = true;
      return false;
    }

    return true;
  });

  // Avoid canonicalizing otherwise untouched URLs as part of this narrow change.
  if (!changed) {
    return trimmedUrl;
  }

  const remainingQuery = remainingParams.length
    ? `?${remainingParams.join("&")}`
    : "";
  return `${trimmedUrl.slice(0, queryIndex)}${remainingQuery}${trimmedUrl.slice(queryEnd)}`;
}

/**
 * Bookmark link URLs are reflected in HTML exports, RSS feeds and anchor tags,
 * so schemes like javascript:, data: and vbscript: must never be accepted.
 */
export function isAllowedBookmarkUrl(url: string): boolean {
  try {
    return ALLOWED_BOOKMARK_URL_PROTOCOLS.includes(new URL(url).protocol);
  } catch {
    return false;
  }
}
