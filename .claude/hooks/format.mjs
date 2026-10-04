import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function repoRoot(start) {
  const parent = path.dirname(start);
  if (parent === start) return null;
  return existsSync(path.join(parent, "lefthook.yml")) ? parent : repoRoot(parent);
}

const input = JSON.parse(readFileSync(0, "utf8"));
const file = path.resolve(String(input.tool_input?.file_path ?? ""));
const root = repoRoot(file);
const relative = root ? path.relative(root, file).replaceAll("\\", "/") : "";

if (/^frontend\/.+\.(?:ts|tsx|js|cjs|mjs|json|jsonc|css|md)$/.test(relative) && relative !== "frontend/openapi.json") {
  spawnSync(process.execPath, ["node_modules/oxfmt/bin/oxfmt", relative.slice("frontend/".length)], {
    cwd: path.join(root, "frontend"),
    stdio: "ignore",
  });
} else if (/^backend\/.+\.cs$/.test(relative) && !relative.includes("/Infrastructure/Data/Migrations/")) {
  spawnSync("dotnet", ["format", "whitespace", ".", "--folder", "--include", relative.slice("backend/".length)], {
    cwd: path.join(root, "backend"),
    stdio: "ignore",
  });
}
