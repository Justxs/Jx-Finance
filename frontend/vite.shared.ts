import { fileURLToPath } from "node:url";
import babel from "@rolldown/plugin-babel";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";

export function reactPlugins() {
  return [react(), babel({ presets: [reactCompilerPreset()] })];
}

export const srcAlias = {
  "@": fileURLToPath(new URL("./src", import.meta.url)),
};
