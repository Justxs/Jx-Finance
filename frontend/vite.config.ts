import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // React Compiler (targets React 19 by default → react/compiler-runtime).
    // Auto-memoizes, so we avoid useMemo/useCallback/useEffect in app code.
    babel({ presets: [reactCompilerPreset()] }),
  ],
  server: {
    proxy: {
      "/api": "http://localhost:8080",
    },
  },
});
