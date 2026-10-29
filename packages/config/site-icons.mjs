/**
 * Shared favicon metadata for public Rheo sites.
 *
 * Google Search reads `<link rel="icon">` on the hostname homepage. The icon must
 * be square, at least 8×8 (larger than 48×48 is recommended), and a BMP, GIF, ICO,
 * PNG, JPEG, PPM, or TIFF. SVG is not used. `type` must match the bytes the server
 * sends: `/favicon.ico` is `image/vnd.microsoft.icon`, and `X-Content-Type-Options:
 * nosniff` makes a declared `image/x-icon` look uncrawled.
 *
 * The 96×96 PNG is first so the icon Google and metadata checkers pick is larger
 * than 48×48. Pass an empty origin to keep root-relative URLs.
 *
 * @param {string} [siteUrl] Canonical origin, e.g. `https://www.getrheo.io`
 */
export const buildSiteIconMetadata = (siteUrl = '') => {
  const trimmed = siteUrl.trim();
  const base = trimmed ? (trimmed.endsWith('/') ? trimmed : `${trimmed}/`) : '';
  const toUrl = (path) => (base ? new URL(path, base).href : path);

  return {
    icon: [
      { url: toUrl('/favicon-96x96.png'), sizes: '96x96', type: 'image/png' },
      { url: toUrl('/favicon-48x48.png'), sizes: '48x48', type: 'image/png' },
      { url: toUrl('/favicon.ico'), sizes: '48x48', type: 'image/vnd.microsoft.icon' },
    ],
    apple: [{ url: toUrl('/apple-touch-icon.png'), sizes: '180x180', type: 'image/png' }],
  };
};
