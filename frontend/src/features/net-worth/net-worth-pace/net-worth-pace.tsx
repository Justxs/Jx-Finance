import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useNetWorthHistorySuspense } from "@/api/generated";
import { useAppForm } from "@/components/form";
import { SignedAmount } from "@/components/signed-amount/signed-amount";
import { Button } from "@/components/ui/button/button";
import {
  ButtonSkeleton,
  IconButtonSkeleton,
  Skeleton,
  TextSkeleton,
} from "@/components/ui/skeleton/skeleton";
import { useIsoDate, useMoney, useMonthName } from "@/hooks/use-formatters";
import {
  MAX_MILESTONES,
  type MilestoneReach,
  milestoneReach,
  suggestedMilestones,
  trailingPace,
  withMilestone,
} from "@/lib/net-worth-pace";
import { money as moneyRule, normalizeMoney } from "@/lib/validation";
import { savePreferences, usePreferences } from "@/stores/preferences";

export function NetWorthPaceSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-3 border-t border-rule pt-4 text-sm">
      <div className="space-y-1">
        <TextSkeleton size="sm" width="w-3/4" />
        <TextSkeleton size="xs" width="w-1/2" />
      </div>
      <ul className="divide-y">
        {Array.from({ length: 2 }, (_, index) => (
          <li key={index} className="flex items-center gap-3 py-1">
            <TextSkeleton size="sm" width="w-20" />
            <TextSkeleton size="sm" className="flex-1" width="w-28" />
            <IconButtonSkeleton />
          </li>
        ))}
      </ul>
      <div className="flex items-start gap-2">
        <Skeleton className="h-9 flex-1 rounded-lg pointer-coarse:h-11" />
        <ButtonSkeleton className="w-28" />
      </div>
    </div>
  );
}

export function NetWorthPace() {
  const { t } = useTranslation();
  const money = useMoney();
  const formatDate = useIsoDate();
  const formatMonth = useMonthName();
  const history = useNetWorthHistorySuspense();
  const { paceMilestones } = usePreferences();
  const pace = trailingPace(history.data.items);
  const milestones = paceMilestones ?? (pace ? suggestedMilestones(pace.latest) : []);

  const form = useAppForm({
    defaultValues: { amount: "" },
    validators: [{ run: z.object({ amount: moneyRule(t) }), triggers: ["change"] }],
    onSubmit: ({ value, formApi }) => {
      savePreferences({
        paceMilestones: withMilestone(milestones, Number(normalizeMoney(value.amount))),
      });
      formApi.reset();
    },
  });

  if (history.data.items.length < 2) {
    return null;
  }

  if (!pace) {
    return <p className="text-sm text-muted-foreground">{t("netWorth.pace.tooShort")}</p>;
  }

  function reachText(reach: MilestoneReach) {
    switch (reach.state) {
      case "reached": {
        return t("netWorth.pace.reached");
      }
      case "on": {
        return t("netWorth.pace.around", { month: formatMonth(reach.date) });
      }
      case "beyond": {
        return t("netWorth.pace.beyond");
      }
      default: {
        return t("netWorth.pace.never");
      }
    }
  }

  return (
    <div className="space-y-3 border-t border-rule pt-4 text-sm">
      <div className="space-y-1">
        <p>
          <SignedAmount value={pace.perMonth} className="font-semibold" />{" "}
          <span className="text-muted-foreground">
            {t("netWorth.pace.perMonth", { from: formatDate(pace.from) })}
          </span>
        </p>
        <p className="text-xs text-muted-foreground">{t("netWorth.pace.note")}</p>
      </div>

      {milestones.length === 0 ? (
        <p className="text-muted-foreground">{t("netWorth.pace.noMilestones")}</p>
      ) : (
        <ul aria-label={t("netWorth.pace.milestones")} className="divide-y">
          {milestones.map((target) => (
            <li key={target} className="flex items-center gap-3 py-1">
              <span className="font-semibold tabular-nums">{money.format(target)}</span>
              <span className="text-muted-foreground">
                {reachText(milestoneReach(pace, target))}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="ml-auto"
                aria-label={t("netWorth.pace.remove", { amount: money.format(target) })}
                onClick={() =>
                  savePreferences({
                    paceMilestones: milestones.filter((milestone) => milestone !== target),
                  })
                }
              >
                <X aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {milestones.length < MAX_MILESTONES ? (
        <form.AppForm>
          <form.FormShell className="flex items-start gap-2">
            <form.Field name="amount">
              {(field) => (
                <field.MoneyInputField
                  id="net-worth-milestone"
                  className="flex-1"
                  aria-label={t("netWorth.pace.milestone")}
                />
              )}
            </form.Field>
            <form.SubmitButton variant="outline">{t("netWorth.pace.add")}</form.SubmitButton>
          </form.FormShell>
        </form.AppForm>
      ) : null}
    </div>
  );
}
