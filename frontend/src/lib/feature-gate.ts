import { redirect } from "@tanstack/react-router";
import type { FeatureKey } from "@/hooks/use-settings";
import { settingsQueryOptions } from "@/hooks/use-settings";
import { queryClient } from "@/lib/query-client";

async function isFeatureEnabled(feature: FeatureKey): Promise<boolean> {
  try {
    const settings = await queryClient.ensureQueryData(settingsQueryOptions());
    return settings.features[feature];
  } catch {
    return true;
  }
}

export function requireFeature(feature: FeatureKey) {
  return async function beforeLoad() {
    if (!(await isFeatureEnabled(feature))) {
      throw redirect({ to: "/" });
    }
  };
}
