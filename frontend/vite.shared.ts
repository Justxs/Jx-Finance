import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";

export function reactPlugins() {
  return react({
    compiler: true,
    exclude: [/[/\\](?:node_modules|src[/\\]api[/\\](?:generated|schemas))[/\\]/],
  });
}

export const srcAlias = {
  "@": fileURLToPath(new URL("./src", import.meta.url)),
};
