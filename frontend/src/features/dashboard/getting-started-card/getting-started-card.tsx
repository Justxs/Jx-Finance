import { useQueryClient } from "@tanstack/react-query";
import { linkOptions } from "@tanstack/react-router";
import { ChevronDown, CircleCheck, Circle } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getDashboardLayoutQueryKey,
  useDashboardLayoutSuspense,
  useGettingStartedSuspense,
  useSaveDashboardLayout,
} from "@/api/generated";
import type { GettingStartedStep, GettingStartedStepResponse } from "@/api/generated/model";
import { Button } from "@/components/ui/button/button";
import { Section, SectionTitle } from "@/components/ui/section/section";
import { TextLink } from "@/components/ui/text-link/text-link";
import { setCardShown } from "@/features/dashboard/dashboard-layout";
import { useFeature } from "@/hooks/use-settings";
import { notify } from "@/lib/mutations";
import { cn } from "@/lib/utils";

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

function useHideCard() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const layout = useDashboardLayoutSuspense().data;
  const save = useSaveDashboardLayout({
    mutation: {
      ...notify(t("dashboard.gettingStarted.hidden")),
      onSuccess: (saved) => queryClient.setQueryData(getDashboardLayoutQueryKey(), saved),
    },
  });

  function hide() {
    const { order, hidden } = setCardShown(layout, "gettingStarted", false);
    save.mutate({ data: { order, hidden } });
  }

  return { hide, pending: save.isPending };
}

function StepList({ id, steps }: Readonly<{ id: string; steps: GettingStartedStepResponse[] }>) {
  const { t } = useTranslation();
  const links = useStepLinks();

  function hintOf(step: GettingStartedStep) {
    return t(`dashboard.gettingStarted.steps.${step}.hint`);
  }

  return (
    <ol id={id} className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
      {steps.map(({ step, done }) => (
        <li key={step} className="flex gap-2">
          {done ? (
            <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-income" />
          ) : (
            <Circle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          )}
          <span className="min-w-0">
            {done ? (
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
                </TextLink>
                {hintOf(step).startsWith(",") ? null : " "}
                <span className="text-muted-foreground">{hintOf(step)}</span>
              </>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}

interface Props {
  className?: string;
}

export function GettingStartedCard({ className }: Readonly<Props>) {
  const { t } = useTranslation();
  const titleId = useId();
  const listId = useId();
  const steps = useGettingStartedSuspense({ query: { staleTime: 0 } }).data;
  const hideCard = useHideCard();
  const [expanded, setExpanded] = useState(false);
  const done = steps.filter((step) => step.done).length;
  const compact = done * 2 >= steps.length;

  if (done === steps.length) {
    return null;
  }

  return (
    <Section aria-labelledby={titleId} className={className}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
          <SectionTitle id={titleId}>{t("dashboard.gettingStarted.title")}</SectionTitle>
          <p className="text-sm text-muted-foreground tabular-nums">
            {t("dashboard.gettingStarted.progress", { done, total: steps.length })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {compact ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-expanded={expanded}
              aria-controls={expanded ? listId : undefined}
              onClick={() => setExpanded(!expanded)}
            >
              <ChevronDown aria-hidden="true" className={cn(expanded && "rotate-180")} />
              {expanded
                ? t("dashboard.gettingStarted.showLess")
                : t("dashboard.gettingStarted.showSteps")}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            tooltip={t("dashboard.gettingStarted.hideLabel")}
            pending={hideCard.pending}
            onClick={hideCard.hide}
          >
            {t("dashboard.gettingStarted.hide")}
          </Button>
        </div>
      </div>
      {compact && !expanded ? null : <StepList id={listId} steps={steps} />}
    </Section>
  );
}
