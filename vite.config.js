import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { imagetools } from "vite-imagetools";

// imagetools makes small, fast gallery thumbnails from the full-size PNGs.
export default defineConfig({ plugins: [react(), imagetools()] });
