import { createInstance } from "i18next";
import type { Translate } from "@/lib/i18n";

type RenderMissingKey = (key: string, options: Record<string, unknown>) => string;

function returnKey(key: string) {
  return key;
}

export function stubTranslate(render: RenderMissingKey = returnKey): Translate {
  const instance = createInstance();
  void instance.init({
    lng: "en",
    resources: {},
    parseMissingKeyHandler: (
      key: string,
      _defaultValue: unknown,
      options: Record<string, unknown>,
    ) => render(key, options),
  });
  return instance.t;
}
