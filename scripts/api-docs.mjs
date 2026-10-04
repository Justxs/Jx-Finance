import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { root } from "./run.mjs";

export const routesDoc = "docs/api-routes.md";
const methods = ["get", "post", "put", "patch", "delete"];

export function routesPage() {
  const contract = JSON.parse(readFileSync(path.join(root, "frontend/openapi.json"), "utf8"));
  const operations = Object.entries(contract.paths)
    .flatMap(([route, item]) => methods.filter((method) => item[method]).map((method) => ({ route, method, ...item[method] })))
    .sort((a, b) => (a.route === b.route ? methods.indexOf(a.method) - methods.indexOf(b.method) : a.route < b.route ? -1 : 1));
  const tables = contract.tags.map(({ name }) => {
    const rows = operations
      .filter((operation) => operation.tags[0] === name)
      .map(({ method, route, summary }) => `| ${method.toUpperCase()} | \`${route}\` | ${summary.replaceAll("|", "\\|")} |`);
    return [`## ${name}`, "", "| Method | Route | Summary |", "| --- | --- | --- |", ...rows].join("\n");
  });
  return [
    "# API routes",
    "",
    "Generated from `frontend/openapi.json` by `just gen`, one table per tag; `just check-docs` fails when it is stale. Do not edit this page: change an operation's summary in its summary class, and keep notes on routes under [Route notes](api.md#route-notes). How endpoints are written and what an error looks like is in [API surface](api.md).",
    "",
    tables.join("\n\n"),
    "",
  ].join("\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = path.join(root, routesDoc);
  const page = routesPage();
  if (!existsSync(file) || readFileSync(file, "utf8") !== page) {
    writeFileSync(file, page);
    console.log(`Updated ${routesDoc}.`);
  }
}
