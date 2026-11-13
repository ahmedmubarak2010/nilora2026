import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  publicDir: false,
  build: {
    lib: {
      entry: "dashboard/main.tsx",
      formats: ["es"],
      fileName: () => "nilora-dashboard.js",
      cssFileName: "nilora-dashboard",
    },
    outDir: "assets/dashboard",
    emptyOutDir: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});