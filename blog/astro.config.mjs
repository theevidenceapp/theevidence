import { defineConfig, envField } from "astro/config";
import react from "@astrojs/react";
import node from "@astrojs/node";

export default defineConfig({
  adapter: node({
    mode: "standalone",
  }),
  env: {
    schema: {
      API_URL: envField.string({
        context: "client",
        access: "public",
      }),
    },
  },
  integrations: [react()],
});
