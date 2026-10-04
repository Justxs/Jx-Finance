import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fail, root } from "./run.mjs";

export const apiDoc = "docs/api.md";
const heading = "## Routes";
const methods = ["get", "post", "put", "patch", "delete"];

function routeSection() {
  const contract = JSON.parse(readFileSync(path.join(root, "frontend/openapi.json"), "utf8"));
  const operations = Object.entries(contract.paths)
    .flatMap(([route, item]) => methods.filter((method) => item[method]).map((method) => ({ route, method, ...item[method] })))
    .sort((a, b) => (a.route === b.route ? methods.indexOf(a.method) - methods.indexOf(b.method) : a.route < b.route ? -1 : 1));
  const tables = contract.tags.map(({ name }) => {
    const rows = operations
      .filter((operation) => operation.tags[0] === name)
      .map(({ method, route, summary }) => `| ${method.toUpperCase()} | \`${route}\` | ${summary.replaceAll("|", "\\|")} |`);
    return [`### ${name}`, "", "| Method | Route | Summary |", "| --- | --- | --- |", ...rows].join("\n");
  });
  return [
    heading,
    "",
    "Generated from `frontend/openapi.json` by `just gen`, one table per tag; `just check-docs` fails when it is stale. Change an operation's summary in its summary class, not here, and keep notes on routes under [Route notes](#route-notes).",
    "",
    tables.join("\n\n"),
    "",
  ].join("\n");
}

export function withRoutes(text) {
  const lines = text.split("\n");
  const start = lines.indexOf(heading);
  if (start < 0) fail(`${apiDoc} has no '${heading}' heading for the generated route list.`);
  const end = lines.findIndex((line, index) => index > start && line.startsWith("## "));
  return [...lines.slice(0, start), routeSection(), ...(end < 0 ? [] : lines.slice(end))].join("\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = path.join(root, apiDoc);
  const text = readFileSync(file, "utf8");
  const updated = withRoutes(text);
  if (updated !== text) {
    writeFileSync(file, updated);
    console.log(`Updated the route list in ${apiDoc}.`);
  }
}
