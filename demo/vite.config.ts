import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
export default defineConfig({
  root: `${root}demo`,
  base: "./",
  publicDir: `${root}public`,
  resolve: { alias: [{ find: "./auth-client", replacement: `${root}demo/no-sync.ts` }] },
  plugins: [react(), {
    name: "reject-account-dependencies",
    generateBundle() {
      for (const id of this.getModuleIds()) {
        if (/firebase|auth-shell|chatgpt-auth|sites-worker/.test(id)) {
          this.error(`Account dependency in guest demo: ${id}`);
        }
      }
    },
  }],
  build: { outDir: `${root}dist-demo`, emptyOutDir: true },
});
