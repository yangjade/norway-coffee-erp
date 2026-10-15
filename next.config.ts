import type { NextConfig } from "next";

/**
 * GitHub project pages need a basePath like `/repo-name`.
 * Set BASE_PATH in CI (workflow does this automatically) or locally:
 *   BASE_PATH=/norway-coffee-erp npm run build
 * Leave empty for user/org sites (username.github.io) or plain local preview.
 */
const rawBase = process.env.BASE_PATH?.trim() ?? "";
const basePath = rawBase.replace(/\/$/, "") || undefined;

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  ...(basePath
    ? {
        basePath,
        assetPrefix: basePath,
      }
    : {}),
};

export default nextConfig;
