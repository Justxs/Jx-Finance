export function byId<T extends { id: string }>(items: T[], id: unknown): T | undefined {
  return items.find((item) => item.id === id);
}

export function paginate<T>(items: T[], params: URLSearchParams) {
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const pageSize = Math.max(1, Number(params.get("pageSize") ?? 20) || 20);
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page, pageSize, total: items.length };
}

export function emptyPage({ request }: { request: Request }) {
  return paginate<never>([], new URL(request.url).searchParams);
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
