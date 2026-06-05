import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Fixes the MIME type/path issue when deploying to production on Railway
  base: "./", 
  
  plugins: [react()],
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
