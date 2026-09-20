import fs from "node:fs";
import path from "node:path";
import { fail, root, run } from "./run.mjs";

const checkDrift = process.argv.includes("--check");
const exportConnection = "Host=localhost;Database=export;Username=export;Password=export";
const generated = ["frontend/openapi.json", "frontend/src/api/generated", "frontend/src/api/schemas"];

try {
  run("dotnet", ["run", "--project", "backend/JxFinance.Api", "-c", "Release", "--export-openapi-docs", "true"], {
    env: { ConnectionStrings__Default: exportConnection },
  });
  fs.copyFileSync(path.join(root, "backend/JxFinance.Api/wwwroot/openapi/v1.json"), path.join(root, "frontend/openapi.json"));
  run("nub", ["run", "--cwd", "frontend", "orval"]);
} catch (error) {
  fail(error.message);
}

if (checkDrift && run("git", ["status", "--porcelain", "--", ...generated], { capture: true }).stdout.trim() !== "") {
  run("git", ["status", "--short", "--", ...generated]);
  if (process.env.CI) run("git", ["--no-pager", "diff", "--", ...generated]);
  fail("API contract or generated client is out of date. Run 'just gen' and commit the result.");
}
