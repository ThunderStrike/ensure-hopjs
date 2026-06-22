export const HOP_HOST = "cdn.hopjs.net";

const UNSUPPORTED_CDN_HOSTS = new Set([
  "unpkg.com",
  "esm.sh",
  "cdn.skypack.dev",
  "jspm.dev",
  "ga.jspm.io",
  "cdn.pika.dev",
]);

/**
 * hop.js currently supports npm and cdnjs-style package URLs.
 * The safest automated migration is therefore:
 * - cdn.jsdelivr.net/npm/...        -> cdn.hopjs.net/npm/...
 * - cdnjs.cloudflare.com/ajax/libs/... -> cdn.hopjs.net/ajax/libs/...
 *
 * Other jsDelivr sources such as /gh/, /wp/, and /combine/ are intentionally
 * flagged instead of rewritten, because they are not covered by the current
 * npm/cdnjs compatibility scope. URLs with query strings are also flagged
 * because hop.js does not support advanced CDN transformations, bundling,
 * or on-the-fly minification.
 */
const SUPPORTED_HOST_PATTERNS = [
  {
    host: "cdn.jsdelivr.net",
    source: "jsDelivr npm",
    isSupportedPath: (pathname) => pathname === "/npm" || pathname.startsWith("/npm/"),
  },
  {
    host: "cdnjs.cloudflare.com",
    source: "cdnjs",
    isSupportedPath: (pathname) => pathname === "/ajax/libs" || pathname.startsWith("/ajax/libs/"),
  },
];

function stripTrailingPunctuation(rawUrl) {
  return rawUrl.replace(/[.,;]+$/, "");
}

function unsupported(from, host, reason) {
  return {
    type: "unsupported-cdn",
    from,
    host,
    reason,
  };
}

function hasPotentialTransformation(parsed) {
  return parsed.search.length > 0;
}

/**
 * Converts a CDN URL to hop.js when it is safe to rewrite.
 *
 * @param {string} rawUrl
 * @returns {null | {type: "already-hop", from: string} | {type: "rewrite", from: string, to: string, source: string} | {type: "unsupported-cdn", from: string, host: string, reason: string}}
 */
export function convertUrl(rawUrl) {
  const cleanUrl = stripTrailingPunctuation(rawUrl);

  let parsed;

  try {
    parsed = new URL(cleanUrl);
  } catch {
    return null;
  }

  if (parsed.hostname === HOP_HOST) {
    return {
      type: "already-hop",
      from: cleanUrl,
    };
  }

  for (const pattern of SUPPORTED_HOST_PATTERNS) {
    if (parsed.hostname !== pattern.host) continue;

    if (!pattern.isSupportedPath(parsed.pathname)) {
      return unsupported(
        cleanUrl,
        parsed.hostname,
        `${pattern.host} URL is not a supported ${pattern.source} package path for automatic hop.js migration`
      );
    }

    if (hasPotentialTransformation(parsed)) {
      return unsupported(
        cleanUrl,
        parsed.hostname,
        "URL has a query string that may rely on CDN-specific transformation, bundling, minification, or cache behavior"
      );
    }

    const from = cleanUrl;
    parsed.hostname = HOP_HOST;

    return {
      type: "rewrite",
      from,
      to: parsed.toString(),
      source: pattern.source,
    };
  }

  if (UNSUPPORTED_CDN_HOSTS.has(parsed.hostname)) {
    return unsupported(
      cleanUrl,
      parsed.hostname,
      "CDN host is not currently supported for automatic hop.js migration"
    );
  }

  return null;
}
