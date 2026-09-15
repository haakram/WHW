import { describe, expect, it } from "vitest";
import { buildCsp, securityHeaders } from "@/lib/security/headers";

describe("security headers", () => {
  it("allows images and media only from Wikimedia and keeps everything else same-origin", () => {
    const csp = buildCsp(false);
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("img-src 'self' data: blob: https://upload.wikimedia.org https://thumb.wikimedia.org https://commons.wikimedia.org");
    expect(csp).toContain("media-src 'self' https://upload.wikimedia.org");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain("unsafe-eval");
    expect(buildCsp(true)).toContain("unsafe-eval");
  });

  it("sets the hardening headers", () => {
    const keys = securityHeaders(false).map((h) => h.key);
    expect(keys).toEqual(expect.arrayContaining(["Content-Security-Policy", "X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy"]));
  });
});
