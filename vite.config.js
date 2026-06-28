import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" sorgt dafür, dass die App auf GitHub Pages
// unter jeder Repository-Adresse korrekt lädt (relative Pfade).
export default defineConfig({
  plugins: [react()],
  base: "./",
});
