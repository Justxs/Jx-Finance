import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { root, run } from "./run.mjs";

const frontend = path.join(root, "frontend");
const workspaceFile = path.join(frontend, "pnpm-workspace.yaml");

run("vp", ["update", "--latest", "!vite", "!vitest", "!@vitest/coverage-v8"], { cwd: "frontend" });
run("vp", ["add", "@tanstack/react-form@alpha"], { cwd: "frontend" });

const bundled = JSON.parse(readFileSync(path.join(frontend, "node_modules/vite-plus/package.json"), "utf8")).dependencies;
const pinned = [
  [/^ {2}vite: .*$/m, `  vite: ${bundled.vite}`],
  [/^ {2}vitest: .*$/m, `  vitest: ${bundled.vitest}`],
  [/^ {2}"@vitest\/coverage-v8": .*$/m, `  "@vitest/coverage-v8": ${bundled.vitest}`],
];
writeFileSync(
  workspaceFile,
  pinned.reduce((text, [line, value]) => text.replace(line, value), readFileSync(workspaceFile, "utf8")),
);
run("vp", ["install"], { cwd: "frontend" });
