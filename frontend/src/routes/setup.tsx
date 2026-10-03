import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Splash } from "@/components/splash/splash";
import { SetupPage } from "@/features/auth/setup-page/setup-page";
import { SetupWizard, wizardSteps } from "@/features/settings/setup-wizard/setup-wizard";
import { optionalParam } from "@/lib/search-schema";

export const Route = createFileRoute("/setup")({
  validateSearch: z.object({ step: optionalParam(z.enum(wizardSteps)) }),
  component: SetupRoute,
});

function SetupRoute() {
  const { step } = Route.useSearch();

  return step ? (
    <QueryBoundary fallback={<Splash />}>
      <SetupWizard step={step} />
    </QueryBoundary>
  ) : (
    <SetupPage />
  );
}
