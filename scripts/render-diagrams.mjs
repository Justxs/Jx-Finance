import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fail, root, run } from "./run.mjs";

const version = "1.2026.8";
const jar = path.join(root, ".local", `plantuml-${version}.jar`);
const folder = path.join(root, "docs", "architecture", "diagrams");

async function download() {
  const url = `https://github.com/plantuml/plantuml/releases/download/v${version}/plantuml-${version}.jar`;
  console.log(`Downloading PlantUML ${version} to .local/`);
  const response = await fetch(url);
  if (!response.ok) fail(`${url} answered ${response.status}`);
  mkdirSync(path.dirname(jar), { recursive: true });
  writeFileSync(jar, Buffer.from(await response.arrayBuffer()));
}

if (!existsSync(jar)) await download();
const sources = readdirSync(folder).filter((file) => file.endsWith(".puml"));
run("java", ["-jar", jar, "-charset", "UTF-8", "-tsvg", ...sources.map((file) => path.join(folder, file))]);
console.log(`Rendered ${sources.length} diagrams in docs/architecture/diagrams.`);
