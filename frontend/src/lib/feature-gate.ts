import type { QueryClient } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";
import type { FeatureKey } from "@/hooks/use-settings";
import { settingsQueryOptions } from "@/hooks/use-settings";
import { checkIsAdmin } from "@/lib/auth-gate";
import type { RouterContext } from "@/lib/route-prefetch";

async function isFeatureEnabled(queryClient: QueryClient, feature: FeatureKey): Promise<boolean> {
  try {
    const settings = await queryClient.query({
      ...settingsQueryOptions(),
      staleTime: "static",
    });
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

export async function requireAdmin({ context }: GateArgs) {
  if (!(await checkIsAdmin(context.queryClient))) {
    throw redirect({ to: "/" });
  }
}
