import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/security/headers";

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders(isDev) }];
  },
};

export default nextConfig;
