import type { Translate } from "@/lib/i18n";

export function fakeTranslate(render: (key: string, options?: Record<string, unknown>) => string) {
  return render as unknown as Translate;
}
