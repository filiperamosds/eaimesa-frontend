import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ["@eaimesa/shared"],
  ...(isDev
    ? {
        // Hostinger usa .htaccess no HTML estático. No `next dev` o Apache
        // não entra — sem isto, /{slug}/c/{token} e /{slug}/delivery/p/{token}
        // são 404 (as páginas são /{slug}/c e /{slug}/delivery/p).
        rewrites: async () => ({
          beforeFiles: [
            { source: "/:slug/c/:token", destination: "/:slug/c/" },
            { source: "/:slug/c/:token/", destination: "/:slug/c/" },
            { source: "/:slug/delivery/p/:token", destination: "/:slug/delivery/p/" },
            { source: "/:slug/delivery/p/:token/", destination: "/:slug/delivery/p/" },
          ],
        }),
      }
    : { output: "export" }),
};

export default nextConfig;
