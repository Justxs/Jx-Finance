export function buildExportUrl(path: string, params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, String(value));
    }
  }
  return `${path}?${search.toString()}`;
}
