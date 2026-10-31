import { defineConfig } from "vite";

// Set CHANASTA_BASE=/chanasta/ for GitHub Pages; "/" is right for Netlify/Cloudflare Pages.
export default defineConfig({
  base: process.env.CHANASTA_BASE ?? "/",
  build: {
    target: "es2022",
    outDir: "dist",
    sourcemap: true,
    assetsInlineLimit: 2048,
  },
  server: { port: 5180, open: false },
});
