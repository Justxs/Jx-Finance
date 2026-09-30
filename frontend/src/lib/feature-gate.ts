import type { QueryClient } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";
import { checkIsAdmin } from "@/lib/auth-gate";
import type { RouterContext } from "@/lib/route-prefetch";
import { type FeatureKey, settingsQueryOptions } from "@/lib/settings";

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
