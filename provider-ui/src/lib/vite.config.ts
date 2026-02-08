import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true, // ✅ if 5173 is taken, Vite will fail instead of switching ports
  },
});
