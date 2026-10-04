import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { apiDoc, withRoutes } from "./api-docs.mjs";
import { codeReferenceProblems } from "./code-references.mjs";
import { designProblems } from "./design-drift.mjs";
import { fail, root, run } from "./run.mjs";

const maxLine = 2000;
const rootFiles = ["AGENTS.md", "CLAUDE.md", "README.md", "PRODUCT.md", "DESIGN.md"];

function walk(dir) {
  return readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return walk(rel);
    return entry.name.endsWith(".md") ? [rel] : [];
  });
}

function slugify(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s/g, "-");
}

const staged = process.argv.includes("--staged")
  ? run("git", ["ls-files"], { capture: true }).stdout.split(/\r?\n/).filter(Boolean)
  : null;
const stagedSet = new Set(staged ?? []);
const indexed = staged ? readIndex(staged.filter((file) => file.endsWith(".md"))) : new Map();

function readIndex(paths) {
  const output = execFileSync("git", ["cat-file", "--batch"], {
    cwd: root,
    input: paths.map((file) => `:${file}`).join("\n"),
    maxBuffer: 1 << 28,
  });
  const contents = new Map();
  let offset = 0;
  for (const file of paths) {
    const headerEnd = output.indexOf(10, offset);
    const size = Number(output.subarray(offset, headerEnd).toString().split(" ")[2]);
    contents.set(file, output.subarray(headerEnd + 1, headerEnd + 1 + size).toString("utf8"));
    offset = headerEnd + 1 + size + 1;
  }
  return contents;
}

function onDisk(file) {
  return existsSync(path.join(root, file));
}

function exists(target) {
  return stagedSet.has(target) || onDisk(target);
}

function readDisk(file) {
  return onDisk(file) ? readFileSync(path.join(root, file), "utf8") : "";
}

function parse(file) {
  return scan(indexed.get(file) ?? readDisk(file));
}

function anchorsOf(file) {
  const anchors = parse(file).anchors;
  return staged ? new Set([...anchors, ...scan(readDisk(file)).anchors]) : anchors;
}

function scan(text) {
  const lines = text.split(/\r?\n/);
  const anchors = new Set();
  const counts = new Map();
  const links = [];
  const long = [];
  let fence = false;
  lines.forEach((line, index) => {
    if (/^\s*```/.test(line)) fence = !fence;
    if (fence) return;
    if (line.length > maxLine && !line.startsWith("|")) long.push(index + 1);
    const heading = line.match(/^#{1,6} (.+)$/);
    if (heading) {
      const base = slugify(heading[1]);
      const seen = counts.get(base) ?? 0;
      counts.set(base, seen + 1);
      anchors.add(seen ? `${base}-${seen}` : base);
    }
    const text = line.replace(/`[^`]*`/g, "");
    for (const match of text.matchAll(/\]\((<[^>]+>|[^)\s]+)\)/g)) {
      links.push({ line: index + 1, target: match[1].replace(/^<|>$/g, "") });
    }
  });
  return { anchors, links, long };
}

const files = staged
  ? staged.filter((file) => rootFiles.includes(file) || (file.startsWith("docs/") && file.endsWith(".md")))
  : [...rootFiles.filter((file) => exists(file)), ...walk("docs")];
const parsed = new Map(files.map((file) => [file, parse(file)]));
const problems = [];

for (const file of files) {
  if (file.startsWith("docs/") && !/^[a-z0-9/.-]+$/.test(file.replace(/README\.md$/, "readme.md"))) {
    problems.push(`${file}: use lowercase kebab-case names without spaces`);
  }
  const { links, long } = parsed.get(file);
  for (const line of long) problems.push(`${file}:${line}: line longer than ${maxLine} characters; break it at a sentence`);
  for (const { line, target } of links) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
    const hash = target.indexOf("#");
    const pathPart = hash >= 0 ? target.slice(0, hash) : target;
    const anchor = hash >= 0 ? target.slice(hash + 1) : "";
    const resolved = pathPart
      ? path.posix.normalize(path.posix.join(path.posix.dirname(file), decodeURI(pathPart)))
      : file;
    if (!exists(resolved)) {
      problems.push(`${file}:${line}: broken link ${target}`);
      continue;
    }
    if (anchor && resolved.endsWith(".md")) {
      const targetAnchors = anchorsOf(resolved);
      if (!targetAnchors.has(anchor)) problems.push(`${file}:${line}: no heading #${anchor} in ${resolved}`);
    }
  }
}

if (files.includes("DESIGN.md")) problems.push(...designProblems(indexed.get("DESIGN.md") ?? readDisk("DESIGN.md")));
if (files.includes(apiDoc)) {
  const text = indexed.get(apiDoc) ?? readDisk(apiDoc);
  if (withRoutes(text) !== text) problems.push(`${apiDoc}: the route list differs from frontend/openapi.json; run just gen`);
}
const referencing = files.filter((file) => file === "AGENTS.md" || (file.startsWith("docs/") && !/^docs\/(decisions|plans)\//.test(file)));
problems.push(...codeReferenceProblems(referencing.map((file) => ({ file, text: indexed.get(file) ?? readDisk(file) }))));

if (problems.length) fail(problems.join("\n"));
console.log(`Checked ${files.length} Markdown files.`);
