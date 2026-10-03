import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, type RouterEvents, createRouter } from "@tanstack/react-router";
import { I18nextProvider } from "react-i18next";
import { onSessionExpired } from "@/api/client";
import { RouteError } from "@/components/route-error/route-error";
import { RoutePending } from "@/components/route-pending/route-pending";
import { Toaster } from "@/components/ui/sonner/sonner";
import { TooltipProvider } from "@/components/ui/tooltip/tooltip";
import { endSession } from "@/lib/auth-gate";
import { i18n } from "@/lib/i18n";
import { pageViewTransition } from "@/lib/page-transition";
import { queryClient } from "@/lib/query-client";
import { type FeatureKey, publicSettingsQueryOptions, settingsQueryOptions } from "@/lib/settings";
import { type ShortcutRouter, registerShortcuts } from "@/lib/shortcuts";
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

function scrollToTopOnPageChange({ pathChanged }: RouterEvents["onBeforeNavigate"]) {
  if (pathChanged) {
    window.scrollTo(0, 0);
  }
}

router.subscribe("onBeforeNavigate", scrollToTopOnPageChange);

function handleSessionExpired() {
  endSession(queryClient, router.navigate);
}

onSessionExpired(handleSessionExpired);

function isFeatureOn(feature: FeatureKey) {
  const settings = queryClient.getQueryData(settingsQueryOptions().queryKey);
  return settings?.features[feature] ?? true;
}

async function loadDefaultLanguage() {
  const settings = await queryClient.query(publicSettingsQueryOptions());
  return settings.defaultLanguage;
}

registerShortcuts(router as ShortcutRouter, {
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
