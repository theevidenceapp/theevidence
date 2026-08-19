import { defineConfig, envField } from "astro/config";
import react from "@astrojs/react";
import vercelAdapter from "@astrojs/vercel";

export default defineConfig({
  output: "server",
  adapter: vercelAdapter(),
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
