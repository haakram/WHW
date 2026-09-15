/**
 * Security headers for the whole app (AI_RULES R3). The CSP allows exactly one class of remote
 * content: images/media from Wikimedia. Scripts, styles, fonts and XHR are same-origin only; the
 * dev server needs 'unsafe-eval' for Turbopack's HMR, production does not.
 */
export const WIKIMEDIA_IMAGE_HOSTS = [
  "https://upload.wikimedia.org",
  "https://thumb.wikimedia.org",
  "https://commons.wikimedia.org",
] as const;

export function buildCsp(isDev: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${WIKIMEDIA_IMAGE_HOSTS.join(" ")}`,
    "media-src 'self' https://upload.wikimedia.org",
    "connect-src 'self'",
    "font-src 'self' data:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export function securityHeaders(isDev: boolean): { key: string; value: string }[] {
  return [
    { key: "Content-Security-Policy", value: buildCsp(isDev) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  ];
}
