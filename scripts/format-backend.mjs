import { readFileSync } from "node:fs";
import path from "node:path";
import { fail, root, run } from "./run.mjs";

const check = process.argv.includes("--check");
const flags = process.argv.slice(2).map((flag) => (flag === "--check" ? "--verify-no-changes" : flag));

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

function stringEnd(text, start) {
  const quotes = text.slice(start).match(/^"+/)[0].length;
  if (quotes >= 3) return text.indexOf('"'.repeat(quotes), start + quotes) + quotes;
  const verbatim = /[@$]*@[@$]*$/.test(text.slice(Math.max(0, start - 3), start));
  for (let i = start + 1; i < text.length; i++) {
    if (verbatim && text[i] === '"' && text[i + 1] === '"') i++;
    else if (!verbatim && text[i] === "\\") i++;
    else if (text[i] === '"' || (!verbatim && text[i] === "\n")) return i + 1;
  }
  return text.length;
}

function commentLines(text) {
  const lines = [];
  for (let i = 0; i < text.length; i++) {
    const pair = text.slice(i, i + 2);
    if (pair === "//" || pair === "/*") {
      lines.push(lineOf(text, i));
      const end = pair === "//" ? text.indexOf("\n", i) : text.indexOf("*/", i + 2) + 1;
      i = end <= 0 ? text.length : end;
    } else if (text[i] === '"') {
      i = stringEnd(text, i) - 1;
    } else if (text[i] === "'") {
      i = text.indexOf("'", text[i + 1] === "\\" ? i + 3 : i + 2);
    }
  }
  return lines;
}

function commentProblems() {
  const files = run("git", ["ls-files", "--cached", "--others", "--exclude-standard", "backend/*.cs"], { capture: true })
    .stdout.split(/\r?\n/)
    .filter((file) => file && !file.includes("/Infrastructure/Data/Migrations/"));
  return files.flatMap((file) => commentLines(readFileSync(path.join(root, file), "utf8")).map((line) => `${file}:${line}: comment`));
}

try {
  run("dotnet", ["format", "backend/JxFinance.slnx", ...flags, "--exclude", "backend/JxFinance.Api/Infrastructure/Data/Migrations"]);
} catch (error) {
  fail(error.message);
}

const comments = check ? commentProblems() : [];
if (comments.length > 0) {
  fail(`${comments.join("\n")}\nNo comments in code: use clearer names or a smaller method, and put any explanation in docs/.`);
}
