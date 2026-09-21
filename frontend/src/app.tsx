import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { I18nextProvider } from "react-i18next";
import { getSettingsQueryKey } from "@/api/generated";
import type { SettingsResponse } from "@/api/generated/model";
import { RouteError } from "@/components/route-error/route-error";
import { RoutePending } from "@/components/route-pending/route-pending";
import { Toaster } from "@/components/ui/sonner/sonner";
import { TooltipProvider } from "@/components/ui/tooltip/tooltip";
import { type FeatureKey, publicSettingsQueryOptions } from "@/hooks/use-settings";
import { setAuthenticated } from "@/lib/auth-gate";
import { i18n } from "@/lib/i18n";
import { pageViewTransition } from "@/lib/page-transition";
import { queryClient } from "@/lib/query-client";
import { registerShortcuts } from "@/lib/shortcuts";
import { initLocale } from "@/stores/app-store";
import { isCommandPaletteOpen, toggleCommandPalette } from "@/stores/command-palette-store";
import { isShortcutsHelpOpen, toggleShortcutsHelp } from "@/stores/shortcuts-help-store";
import { routeTree } from "./route-tree.gen";

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
  defaultPendingComponent: RoutePending,
  defaultErrorComponent: RouteError,
  defaultPendingMs: 200,
  defaultPendingMinMs: 400,
  defaultViewTransition: pageViewTransition,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function handleSessionExpired() {
  setAuthenticated(false);
  queryClient.clear();
  void router.navigate({ to: "/login" });
}

window.addEventListener("jx:session-expired", handleSessionExpired);
function isFeatureOn(feature: FeatureKey) {
  const settings = queryClient.getQueryData<SettingsResponse>(getSettingsQueryKey());
  return settings?.features[feature] ?? true;
}

async function loadDefaultLanguage() {
  const settings = await queryClient.query(publicSettingsQueryOptions());
  return settings.defaultLanguage;
}

registerShortcuts(router, {
  toggleHelp: toggleShortcutsHelp,
  isHelpOpen: isShortcutsHelpOpen,
  togglePalette: toggleCommandPalette,
  isPaletteOpen: isCommandPaletteOpen,
  isFeatureEnabled: isFeatureOn,
});
void initLocale(loadDefaultLanguage);

export function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <RouterProvider router={router} />
        </TooltipProvider>
        <Toaster />
      </QueryClientProvider>
    </I18nextProvider>
  );
}
