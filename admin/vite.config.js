import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import path from "path";

// Las variables VITE_* viven en la raíz del repo (../.env.local) para que
// frontend y admin compartan config. envDir apunta a esa raíz.
const rootDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(rootDir, "..");

export default defineConfig({
  plugins: [react()],
  envDir: repoRoot,
  server: { host: true, port: 5174 },
});
