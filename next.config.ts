import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ["@eaimesa/shared"],
  ...(isDev
    ? {
        // Hostinger usa .htaccess no HTML estático. No `next dev` o Apache
        // não entra — sem isto, /{slug}/c/{token} é 404 (a página é /{slug}/c).
        rewrites: async () => ({
          beforeFiles: [
            { source: "/:slug/c/:token", destination: "/:slug/c/" },
            { source: "/:slug/c/:token/", destination: "/:slug/c/" },
          ],
        }),
      }
    : { output: "export" }),
};

export default nextConfig;
