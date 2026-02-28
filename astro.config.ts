import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/conversor",
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
  // CSRF origin check is disabled because this API is consumed via
  // JavaScript fetch() from the same origin. Since the app has no
  // authentication cookies, there is no CSRF attack surface: cross-origin
  // multipart file uploads are blocked by the browser's CORS preflight.
  security: {
    checkOrigin: false,
  },
});
