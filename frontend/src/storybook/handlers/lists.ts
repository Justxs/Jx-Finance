import type { PathParams } from "msw";
import { found, query, readBody } from "./http";
import type { Body } from "./http";

export function byId<T extends { id: string }>(items: T[], id: unknown): T | undefined {
  return items.find((item) => item.id === id);
}

export function byIdFrom<T extends { id: string }>(items: T[]) {
  return function get({ params }: { params: PathParams }): T {
    return found(byId(items, params.id));
  };
}

function mergeBody<T>(base: T, body: Body): T {
  return { ...base, ...body };
}

export function updateFrom<T extends { id: string }>(
  items: T[],
  merge: (base: T, body: Body) => T = mergeBody,
) {
  return async function update({ params, request }: { params: PathParams; request: Request }) {
    return merge(found(byId(items, params.id)), await readBody(request));
  };
}

export function paginate<T>(items: T[], params: URLSearchParams) {
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const pageSize = Math.max(1, Number(params.get("pageSize") ?? 20) || 20);
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page, pageSize, total: items.length };
}

export function emptyPage({ request }: { request: Request }) {
  return paginate<never>([], query(request));
}

export function includesText(value: string | null | undefined, search: string): boolean {
  return (value ?? "").toLocaleLowerCase("lt").includes(search.toLocaleLowerCase("lt"));
}

export function compareText(a: string | null | undefined, b: string | null | undefined): number {
  return (a ?? "").localeCompare(b ?? "", "lt");
}

export function applyDirection<T>(
  items: T[],
  params: URLSearchParams,
  fallback: "asc" | "desc",
): T[] {
  return (params.get("direction") ?? fallback) === "desc" ? items.toReversed() : items;
}
