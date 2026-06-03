import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  preview: {
    allowedHosts: true,
    host: "0.0.0.0",
    port: process.env.PORT ? parseInt(process.env.PORT) : 4173,
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
