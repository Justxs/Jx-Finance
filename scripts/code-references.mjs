import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { root } from "./run.mjs";

const corpusFile = /\.(cs|csproj|props|ts|tsx|mjs|js|ps1|json|jsonc|ya?ml|css|html|example)$|(^|\/)(Caddyfile[\w.]*|Dockerfile|justfile)$/;
const codeFile = /\.(cs|ts|tsx|mjs|ps1)$/;
const pathFile = /\.(cs|csproj|slnx|props|ts|tsx|mjs|js|ps1|json|jsonc|ya?ml|md|css|html|puml|svg|txt)$/;
const bases = ["", "backend/", "backend/JxFinance.Api/", "backend/JxFinance.Api/Endpoints/", "backend/JxFinance.Tests/", "frontend/", "frontend/src/"];
const identifier = /^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*(\([^()]*\))?$/;
const typeName = /^[A-Z](?=[\w$]*[a-z])(?=[\w$]*[a-z0-9][A-Z])[\w$]*$/;
const libraryNames = new Set([
  "AddProblemDetails",
  "CollectionBehavior",
  "ConvertTimeToUtc",
  "ExecuteDelete",
  "ExecuteUpdate",
  "HttpClientFactory",
  "IntersectionObserver",
  "JwtBearerHandler",
  "PreToolUse",
  "RefreshTokenService",
  "RequestMapper",
  "ResizeObserver",
  "ResponseMapper",
  "SignInManager",
  "StartTlsWhenAvailable",
  "TestServer",
  "TypedResults",
]);

function git(args, input) {
  try {
    return execFileSync("git", args, { cwd: root, input, maxBuffer: 1 << 28 }).toString().split("\n").filter(Boolean);
  } catch (error) {
    if (error.status === 1) return [];
    throw error;
  }
}

function packages() {
  const manifest = JSON.parse(readFileSync(path.join(root, "frontend/package.json"), "utf8"));
  return new Set(Object.keys({ ...manifest.dependencies, ...manifest.devDependencies }));
}

function index() {
  const files = git(["ls-files", "--cached", "--others", "--exclude-standard"]);
  const known = new Set();
  const roots = new Set();
  const tokens = new Set();
  for (const file of files) {
    const parts = file.split("/");
    for (let start = 0; start < parts.length; start++) {
      for (let end = start + 1; end <= parts.length; end++) known.add(parts.slice(start, end).join("/"));
      known.add(parts.slice(start).join("/").replace(/\.(cs|tsx?)$/, ""));
    }
    for (const base of bases) {
      const rest = file.startsWith(base) ? file.slice(base.length).split("/") : [];
      if (rest.length > 1) roots.add(rest[0]);
    }
    if (file.startsWith("docs/") || !corpusFile.test(file)) continue;
    let text;
    try {
      text = readFileSync(path.join(root, file), "utf8");
    } catch {
      continue;
    }
    for (const match of text.matchAll(/[A-Za-z_$][\w$]*/g)) tokens.add(match[0]);
  }
  return { known, roots, tokens, packages: packages() };
}

function pathOf(span, { roots, packages }) {
  const target = span.replace(/^@\//, "frontend/src/").replace(/^\.\//, "").replace(/\/$/, "");
  if (/[\s{}<>*?=:,;|\\"'`[\]()#@]|\.\.|^\/|^\.[^a-z]/.test(target)) return null;
  const parts = target.split("/");
  if (parts.length === 1) return codeFile.test(target) && !target.startsWith(".") ? target : null;
  if (packages.has(parts[0])) return null;
  return roots.has(parts[0]) || pathFile.test(target) ? target : null;
}

function namesOf(span) {
  if (!identifier.test(span)) return [];
  return span
    .replace(/\(.*\)$/, "")
    .split(".")
    .filter((segment) => typeName.test(segment) && !segment.includes("__") && !libraryNames.has(segment));
}

export function codeReferenceProblems(docs) {
  const context = index();
  const missing = [];
  for (const { file, text } of docs) {
    let fence = false;
    let history = false;
    text.split(/\r?\n/).forEach((line, lineIndex) => {
      if (/^\s*```/.test(line)) fence = !fence;
      if (fence) return;
      if (/^#{2,6} /.test(line)) history = /^#{2,6} (Done|Log)$/.test(line);
      if (history) return;
      for (const [, span] of line.matchAll(/`([^`]+)`/g)) {
        const target = pathOf(span, context);
        const unresolved = target
          ? [target].filter((name) => !context.known.has(name))
          : namesOf(span).filter((name) => !context.tokens.has(name));
        for (const name of unresolved) missing.push({ file, line: lineIndex + 1, name, isPath: Boolean(target) });
      }
    });
  }
  const candidates = missing.filter((item) => item.isPath).flatMap((item) => bases.flatMap((base) => [base + item.name, `${base}${item.name}/`]));
  const ignored = new Set(candidates.length ? git(["check-ignore", "--no-index", "--stdin"], candidates.join("\n")) : []);
  return missing
    .filter((item) => !bases.some((base) => ignored.has(base + item.name) || ignored.has(`${base}${item.name}/`)))
    .map(({ file, line, name, isPath }) => `${file}:${line}: no ${isPath ? "file or folder" : "name"} ${name} in the code; renamed? update or drop the reference`);
}
