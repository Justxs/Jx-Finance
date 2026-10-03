import { linkOptions } from "@tanstack/react-router";
import { CircleCheck, Circle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useGettingStartedSuspense } from "@/api/generated";
import type { GettingStartedStep } from "@/api/generated/model";
import { TextLink } from "@/components/ui/text-link/text-link";
import { DashboardSection } from "@/features/dashboard/dashboard-section/dashboard-section";
import { useFeature } from "@/hooks/use-settings";

function useStepLinks() {
  const budgets = useFeature("budgets");

  return {
    addAccount: linkOptions({ to: "/accounts", search: { new: "account" } }),
    addTransaction: linkOptions({ to: "/transactions", search: { new: true } }),
    sortSpending: linkOptions({ to: "/transactions" }),
    planAhead: budgets ? linkOptions({ to: "/budgets" }) : linkOptions({ to: "/goals" }),
    addRecurring: linkOptions({ to: "/recurring-bills" }),
    secureSignIn: linkOptions({ to: "/profile", search: { section: "security" } }),
    inviteMember: linkOptions({ to: "/users" }),
    setUpEmail: linkOptions({ to: "/settings", search: { section: "notificationProviders" } }),
    takeBackup: linkOptions({ to: "/settings", search: { section: "backups" } }),
    closeMonth: linkOptions({ to: "/reports/month" }),
  } satisfies Record<GettingStartedStep, unknown>;
}

interface Props {
  className?: string;
}

export function GettingStartedCard({ className }: Readonly<Props>) {
  const { t } = useTranslation();
  const steps = useGettingStartedSuspense({ query: { staleTime: 0 } }).data;
  const links = useStepLinks();
  const done = steps.filter((step) => step.done).length;

  if (done === steps.length) {
    return null;
  }

  return (
    <DashboardSection className={className} title={t("dashboard.gettingStarted.title")}>
      <p className="text-sm text-muted-foreground">
        {t("dashboard.gettingStarted.progress", { done, total: steps.length })}
      </p>
      <ol className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
        {steps.map(({ step, done: stepDone }) => (
          <li key={step} className="flex gap-2">
            {stepDone ? (
              <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-income" />
            ) : (
              <Circle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            )}
            <span className="min-w-0">
              {stepDone ? (
                <>
                  <span className="text-muted-foreground line-through">
                    {t(`dashboard.gettingStarted.steps.${step}.label`)}
                  </span>
                  <span className="sr-only">, {t("dashboard.gettingStarted.done")}</span>
                </>
              ) : (
                <>
                  <TextLink {...links[step]}>
                    {t(`dashboard.gettingStarted.steps.${step}.label`)}
                  </TextLink>{" "}
                  <span className="text-muted-foreground">
                    {t(`dashboard.gettingStarted.steps.${step}.hint`)}
                  </span>
                </>
              )}
            </span>
          </li>
        ))}
      </ol>
    </DashboardSection>
  );
}
