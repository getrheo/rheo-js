/**
 * Shared security headers for public Next.js sites (@rheo/marketing, @rheo/docs).
 */

export const validatePublicSiteUrl = (raw, { requireHttps = false, label = 'site URL' } = {}) => {
  const trimmed = raw?.trim();
  if (!trimmed) {
    throw new Error(`${label} is required`);
  }
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`${label} must be a valid URL`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`${label} must use http or https`);
  }
  if (requireHttps && parsed.protocol !== 'https:') {
    throw new Error(`${label} must use https in production`);
  }
  if (parsed.username || parsed.password) {
    throw new Error(`${label} must not include credentials`);
  }
  if (parsed.search || parsed.hash) {
    throw new Error(`${label} must not include query or hash`);
  }
  if (parsed.pathname !== '/' && parsed.pathname !== '') {
    throw new Error(`${label} must not include a path`);
  }
  return `${parsed.protocol}//${parsed.host}`;
};

export const createBaselineSecurityHeaders = ({ isProduction = false, siteUrl } = {}) => {
  const headers = [
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), payment=()',
    },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  ];

  if (isProduction && siteUrl?.startsWith('https://')) {
    headers.push({
      key: 'Strict-Transport-Security',
      value: 'max-age=31536000; includeSubDomains',
    });
  }

  return headers;
};

export const buildContentSecurityPolicy = ({
  profile = 'docs',
  reportOnly = true,
  siteUrl,
} = {}) => {
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self' mailto:",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ];

  if (profile === 'marketing') {
    directives.push('frame-src https://www.youtube.com');
  } else {
    directives.push("frame-src 'none'");
  }

  if (siteUrl?.startsWith('https://')) {
    directives.push('upgrade-insecure-requests');
  }

  const value = directives.join('; ');
  const key = reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';
  return { key, value };
};

export const createPublicSiteHeaders = ({
  siteUrl,
  profile = 'docs',
  isProduction = false,
  reportOnly = true,
} = {}) => [
  ...createBaselineSecurityHeaders({ isProduction, siteUrl }),
  buildContentSecurityPolicy({ profile, reportOnly, siteUrl }),
];
