import { defineConfig, envField } from "astro/config";
import react from "@astrojs/react";
import vercelAdapter from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import node from "@astrojs/node";
import sitemap from '@astrojs/sitemap';

import sitemap from "@astrojs/sitemap";

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
  site: 'https://theevidence.org', //replavewith original url
  integrations: [react(), sitemap()],
});