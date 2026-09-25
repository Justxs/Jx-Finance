import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function run(command, args, options = {}) {
  const windows = process.platform === "win32";
  const quoted = args.map((arg) => (/\s/.test(arg) ? `"${arg}"` : arg));
  const result = spawnSync(windows ? [command, ...quoted].join(" ") : command, windows ? [] : args, {
    cwd: root,
    env: { ...process.env, ...options.env },
    encoding: "utf8",
    shell: windows,
    stdio: options.capture ? ["ignore", "pipe", "inherit"] : "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0 && !options.allowFailure) throw new Error(`${command} ${args.join(" ")} exited with ${result.status}`);
  return { status: result.status, stdout: result.stdout ?? "" };
}

export function fail(message) {
  console.error(process.env.GITHUB_ACTIONS ? `::error::${message}` : message);
  process.exit(1);
}

export function scaffold(folder, files) {
  if (existsSync(folder)) fail(`${folder} already exists.`);
  mkdirSync(folder, { recursive: true });
  for (const [file, content] of Object.entries(files)) writeFileSync(path.join(folder, file), content);
  console.log(`Created ${Object.keys(files).length} files in ${path.relative(root, folder).replaceAll(path.sep, "/")}.`);
}
