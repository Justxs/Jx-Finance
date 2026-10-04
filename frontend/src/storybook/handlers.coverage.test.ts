import { readFileSync } from "node:fs";
import { HttpHandler } from "msw";
import { expect, test } from "vitest";
import { handlers } from "./handlers";

interface Operation {
  operationId: string;
  tags: string[];
}

const spec: { paths: Record<string, Record<string, Operation>> } = JSON.parse(
  readFileSync("openapi.json", "utf8"),
);

const withoutHandler = new Set([
  "Refresh",
  "DownloadBackup",
  "ExportTaxSummary",
  "UpdateGoalProgress",
  "GetPing",
]);

function routeKey(method: string, path: string) {
  return `${method.toUpperCase()} ${path}`;
}

function handlerName(method: string, operationId: string) {
  const name = method === "get" ? operationId.replace(/^Get(?=[A-Z])/, "") : operationId;
  return `get${name}MockHandler`;
}

function handlerFile(tag: string) {
  const kebab = tag.replaceAll(/(?<=[a-z])(?=[A-Z])/g, "-").toLowerCase();
  return `src/storybook/handlers/${kebab}.ts`;
}

const handled = new Set(
  handlers.flatMap((handler) =>
    handler instanceof HttpHandler && typeof handler.info.path === "string"
      ? [routeKey(handler.info.method.toString(), handler.info.path)]
      : [],
  ),
);

const operations = Object.entries(spec.paths).flatMap(([path, methods]) =>
  Object.entries(methods).map(([method, operation]) => ({
    ...operation,
    method,
    route: routeKey(method, `*${path.replaceAll(/\{(\w+)\}/g, ":$1")}`),
  })),
);

test("every API operation has a default Storybook handler or is listed as having none", () => {
  const missing = operations
    .filter((item) => !handled.has(item.route) && !withoutHandler.has(item.operationId))
    .map(
      (item) =>
        `${item.operationId} (${item.route}): add ${handlerName(item.method, item.operationId)} to ${handlerFile(item.tags[0] ?? "")}, or list it in withoutHandler`,
    );
  expect(missing).toEqual([]);
});

test("operations listed as having no handler still exist and still have none", () => {
  const stale = [...withoutHandler].filter(
    (id) => !operations.some((item) => item.operationId === id && !handled.has(item.route)),
  );
  expect(stale).toEqual([]);
});
