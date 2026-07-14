/**
 * Shared favicon metadata for public Rheo sites (marketing, docs).
 * Google Search expects a crawlable 48×48 PNG with explicit `sizes` and `type`.
 *
 * @param {string} siteUrl Canonical origin, e.g. `https://getrheo.io`
 */
export const buildSiteIconMetadata = (siteUrl) => {
  const base = siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`;
  const toAbsolute = (path) => new URL(path, base).href;

  return {
    icon: [
      { url: toAbsolute('/favicon-48x48.png'), sizes: '48x48', type: 'image/png' },
      { url: toAbsolute('/favicon-96x96.png'), sizes: '96x96', type: 'image/png' },
      { url: toAbsolute('/favicon.ico'), sizes: '48x48', type: 'image/x-icon' },
    ],
    apple: [{ url: toAbsolute('/apple-touch-icon.png'), sizes: '180x180', type: 'image/png' }],
    shortcut: [{ url: toAbsolute('/favicon-48x48.png'), type: 'image/png' }],
  };
};
