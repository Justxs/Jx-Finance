import type { QueryClient } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";
import type { FeatureKey } from "@/hooks/use-settings";
import { settingsQueryOptions } from "@/hooks/use-settings";
import type { RouterContext } from "@/lib/route-prefetch";

async function isFeatureEnabled(queryClient: QueryClient, feature: FeatureKey): Promise<boolean> {
  try {
    const settings = await queryClient.ensureQueryData(settingsQueryOptions());
    return settings.features[feature];
  } catch {
    return true;
  }
}

interface GateArgs {
  context: RouterContext;
}

export function requireFeature(feature: FeatureKey) {
  return async function beforeLoad({ context }: GateArgs) {
    if (!(await isFeatureEnabled(context.queryClient, feature))) {
      throw redirect({ to: "/" });
    }
  };
}
