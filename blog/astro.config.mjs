import { defineConfig, envField } from "astro/config";
import react from "@astrojs/react";

export default defineConfig({
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
