import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  cacheComponents: true,
  turbopack: {
    rules: {
      // only the Tailwind entry; *.module.css must keep Next's native CSS-modules pipeline
      "globals.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default createNextIntlPlugin()(nextConfig);
