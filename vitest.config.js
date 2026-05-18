import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

// Por default Vitest corre solo el suite puro (rápido, sin red).
// Los tests de integración viven en tests/integration y requieren
// Supabase local levantado. Se corren con `npm run test:integration`
// que setea VITEST_INTEGRATION=1.
const integration = process.env.VITEST_INTEGRATION === "1";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(rootDir, "./src") },
  },
  test: {
    include: integration
      ? ["tests/integration/**/*.test.js"]
      : ["src/**/*.test.js"],
    testTimeout: integration ? 30000 : 5000,
  },
});
