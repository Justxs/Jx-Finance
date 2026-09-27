import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
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

function parse(file) {
  const lines = readFileSync(path.join(root, file), "utf8").split(/\r?\n/);
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

const staged = process.argv.includes("--staged")
  ? new Set(run("git", ["ls-files", "--", "*.md"], { capture: true }).stdout.split(/\r?\n/))
  : null;
const files = [...rootFiles.filter((file) => existsSync(path.join(root, file))), ...walk("docs")].filter(
  (file) => !staged || staged.has(file),
);
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
    if (!existsSync(path.join(root, resolved))) {
      problems.push(`${file}:${line}: broken link ${target}`);
      continue;
    }
    if (anchor && resolved.endsWith(".md")) {
      const targetAnchors = parsed.get(resolved)?.anchors ?? parse(resolved).anchors;
      if (!targetAnchors.has(anchor)) problems.push(`${file}:${line}: no heading #${anchor} in ${resolved}`);
    }
  }
}

if (problems.length) fail(problems.join("\n"));
console.log(`Checked ${files.length} Markdown files.`);
