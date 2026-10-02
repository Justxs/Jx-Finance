import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { root } from "./run.mjs";

const design = "DESIGN.md";
const stylesheet = "frontend/src/global.css";
const pathRoots = ["frontend/src", "frontend/public", "frontend", "."];
const fileName = /\.(css|html|ico|json|md|png|svg|ts|tsx|webmanifest)$/;

function sourceFiles(dir) {
  return readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return rel === "frontend/src/storybook" ? [] : sourceFiles(rel);
    return /\.tsx?$/.test(entry.name) && !/\.(stories|test)\.tsx?$/.test(entry.name) ? [rel] : [];
  });
}

function read(file) {
  return readFileSync(path.join(root, file), "utf8");
}

function splitBody(lines) {
  if (lines[0] !== "---") return { frontmatter: [], bodyStart: 0 };
  const end = lines.indexOf("---", 1);
  return { frontmatter: lines.slice(1, end), bodyStart: end + 1 };
}

function frontmatterColors(frontmatter) {
  const colors = [];
  let inColors = false;
  frontmatter.forEach((line, index) => {
    if (/^\S/.test(line)) inColors = line === "colors:";
    const match = inColors && line.match(/^\s+([\w-]+):\s*"?(#[0-9a-fA-F]{3,8})"?\s*$/);
    if (match) colors.push({ line: index + 2, name: match[1], value: match[2] });
  });
  return colors;
}

function lightValues(css) {
  const block = css.match(/^:root[^{]*\{([^}]*)\}/m)?.[1] ?? "";
  return new Map([...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((match) => [match[1], match[2].trim()]));
}

function codeSpans(lines, bodyStart) {
  const spans = [];
  let fence = false;
  lines.forEach((line, index) => {
    if (index < bodyStart) return;
    if (/^\s*```/.test(line)) fence = !fence;
    if (fence) return;
    for (const match of line.matchAll(/`([^`]+)`/g)) spans.push({ line: index + 1, token: match[1] });
  });
  return spans;
}

function pathExists(token) {
  return pathRoots.some((base) =>
    ["", ".ts", ".tsx"].some((suffix) => existsSync(path.join(root, base, token + suffix))),
  );
}

function isPath(token) {
  return /^[\w.-]+(\/[\w.-]+)*$/.test(token) && !/\/\d+$/.test(token) && (token.includes("/") || fileName.test(token));
}

function problemOf(token, code, declared, css) {
  if (/^--[\w-]+$/.test(token)) {
    const pattern = new RegExp(`${token}(?![\\w-])`);
    return pattern.test(css) || pattern.test(code) ? null : `no CSS variable ${token} in ${stylesheet} or frontend/src`;
  }
  if (isPath(token))
    return pathExists(token)
      ? null
      : `no path ${token} under frontend/src, frontend/public, frontend or the repository root`;
  const name = token.replace(/^(\w+)\(.*$/, "$1");
  if (/^[A-Z][a-z]\w*$/.test(name)) return declared.has(name) ? null : `no declaration of ${name} in frontend/src`;
  if (/^[A-Z]\w*(\.[A-Z]\w*)+$/.test(name)) return code.includes(name) ? null : `no use of ${name} in frontend/src`;
  if (/^[a-z][a-z0-9]*[A-Z]\w*$/.test(name)) {
    return new RegExp(`\\b${name}\\b`).test(code) ? null : `no identifier ${name} in frontend/src`;
  }
  return null;
}

export function designProblems(text) {
  const lines = text.split(/\r?\n/);
  const { frontmatter, bodyStart } = splitBody(lines);
  const css = read(stylesheet);
  const code = sourceFiles("frontend/src").map(read).join("\n");
  const declared = new Set(
    [...code.matchAll(/\b(?:function|const|let|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g)].map(
      (match) => match[1],
    ),
  );
  const problems = [];
  for (const { line, token } of codeSpans(lines, bodyStart)) {
    const problem = problemOf(token, code, declared, css);
    if (problem) problems.push(`${design}:${line}: ${problem}`);
  }
  const body = lines.slice(bodyStart).join("\n");
  const mapped = new Map();
  for (const match of body.matchAll(/`([a-z][\w-]*)`, `(--[\w-]+)`/g)) {
    if (!mapped.has(match[1])) mapped.set(match[1], match[2]);
  }
  const light = lightValues(css);
  for (const { line, name, value } of frontmatterColors(frontmatter)) {
    const variable = mapped.get(name);
    const actual = variable && light.get(variable);
    if (!variable)
      problems.push(`${design}:${line}: color ${name} is not mapped to a CSS variable in the Colors section`);
    else if (!actual)
      problems.push(`${design}:${line}: color ${name} maps to ${variable}, which ${stylesheet} :root does not set`);
    else if (actual.toLowerCase() !== value.toLowerCase()) {
      problems.push(`${design}:${line}: color ${name} is ${value} but ${variable} in ${stylesheet} :root is ${actual}`);
    }
  }
  return problems;
}
