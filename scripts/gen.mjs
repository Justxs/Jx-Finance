import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fail, root, run } from "./run.mjs";

const checkDrift = process.argv.includes("--check");
const exportConnection = "Host=localhost;Database=export;Username=export;Password=export";
const generated = ["frontend/openapi.json", "frontend/src/api/generated", "frontend/src/api/schemas"];

function snapshot() {
  const hashes = new Map();
  for (const entry of generated) {
    const full = path.join(root, entry);
    if (!fs.existsSync(full)) continue;
    const files = fs.statSync(full).isDirectory()
      ? fs.readdirSync(full, { recursive: true }).map((file) => path.join(full, file))
      : [full];
    for (const file of files) {
      if (fs.statSync(file).isFile()) {
        hashes.set(path.relative(root, file).replaceAll(path.sep, "/"), createHash("sha256").update(fs.readFileSync(file)).digest("hex"));
      }
    }
  }
  return hashes;
}

const before = checkDrift ? snapshot() : new Map();

try {
  run("dotnet", ["run", "--project", "backend/JxFinance.Api", "-c", "Release", "--export-openapi-docs", "true"], {
    env: { ConnectionStrings__Default: exportConnection },
  });
  fs.copyFileSync(path.join(root, "backend/JxFinance.Api/wwwroot/openapi/v1.json"), path.join(root, "frontend/openapi.json"));
  run("nub", ["run", "--cwd", "frontend", "orval"]);
} catch (error) {
  fail(error.message);
}

if (checkDrift) {
  const after = snapshot();
  const changed = [...new Set([...before.keys(), ...after.keys()])].filter((file) => before.get(file) !== after.get(file)).sort();
  if (changed.length > 0) {
    for (const file of changed) console.error(`  ${file}`);
    if (process.env.CI) run("git", ["--no-pager", "diff", "--", ...generated]);
    fail("API contract or generated client is out of date. Run 'just gen' and commit the result.");
  }
}
