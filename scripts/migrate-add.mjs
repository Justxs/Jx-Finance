import { readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fail, root, run } from "./run.mjs";

const folder = path.join(root, "backend/JxFinance.Api/Infrastructure/Data/Migrations");
const snapshot = path.join(folder, "AppDbContextModelSnapshot.cs");

export function normalize(file) {
  const text = readFileSync(file, "utf8").replace(/^\uFEFF/, "").replaceAll("\r\n", "\n");
  writeFileSync(file, text);
}

export function isEmptyMigration(text) {
  return ["Up", "Down"].every((method) => new RegExp(`void ${method}\\(MigrationBuilder migrationBuilder\\)\\s*\\{\\s*\\}`).test(text));
}

function addMigration(name) {
  const before = new Set(readdirSync(folder));
  const snapshotBefore = readFileSync(snapshot, "utf8");
  run("dotnet", ["build", "backend/JxFinance.Api", "-c", "Release", "--no-incremental", "--nologo", "-v", "quiet"]);
  run("dotnet", ["ef", "migrations", "add", name, "--configuration", "Release", "--no-build", "--project", "JxFinance.Api", "--output-dir", "Infrastructure/Data/Migrations"], {
    cwd: "backend",
    env: { ConnectionStrings__Default: "Host=localhost;Database=export;Username=export;Password=export" },
  });
  const added = readdirSync(folder).filter((file) => !before.has(file)).map((file) => path.join(folder, file));
  for (const file of [...added, snapshot]) normalize(file);
  const migration = added.find((file) => file.endsWith(`_${name}.cs`));
  if (migration && isEmptyMigration(readFileSync(migration, "utf8"))) {
    for (const file of added) rmSync(file);
    writeFileSync(snapshot, snapshotBefore);
    fail(`Migration ${name} had empty Up and Down methods and was removed. The model has no changes, or the build was stale.`);
  }
}

if (import.meta.main) {
  const name = process.argv[2];
  if (!name) fail("Usage: node scripts/migrate-add.mjs <Name>");
  try {
    addMigration(name);
  } catch (error) {
    fail(error.message);
  }
}
