import { useTranslation } from "react-i18next";
import { useGoalsSuspense } from "@/api/generated";
import type { GoalResponse } from "@/api/generated/model";
import { ShareRow } from "@/components/share-row/share-row";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { TextLink } from "@/components/ui/text-link/text-link";
import { EMPTY_VALUE, useMoney, usePercent } from "@/hooks/use-formatters";

function isReached(goal: GoalResponse) {
  return goal.progressAmount !== null && Number(goal.progressAmount) >= Number(goal.targetAmount);
}

function byNextToReach(a: GoalResponse, b: GoalResponse) {
  return (
    Number(isReached(a)) - Number(isReached(b)) ||
    (a.targetDate ?? "9999").localeCompare(b.targetDate ?? "9999")
  );
}

export function GoalsSnapshot() {
  const { t } = useTranslation();
  const money = useMoney();
  const percent = usePercent();
  const goals = useGoalsSuspense().data.toSorted(byNextToReach);

  if (goals.length === 0) {
    return (
      <EmptyText>
        {t("goals.empty")} <TextLink to="/goals">{t("goals.add")}</TextLink>
      </EmptyText>
    );
  }

  return (
    <ul className="space-y-3.5">
      {goals.map((goal) => {
        const target = Number(goal.targetAmount);
        const current = goal.progressAmount === null ? null : Number(goal.progressAmount);
        let note = t("goals.progressUnavailable");
        if (current !== null) {
          note = isReached(goal)
            ? t("goals.reached")
            : t("goals.remaining", { amount: money.format(target - current) });
        }
        return (
          <ShareRow
            key={goal.id}
            name={<span className="min-w-0 flex-1 wrap-break-word">{goal.name}</span>}
            note={
              <span className="shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                {note}
              </span>
            }
            amount={current === null ? EMPTY_VALUE : money.format(current)}
            value={current ?? 0}
            max={target}
            tone="positive"
            meterLabel={
              current === null
                ? undefined
                : t("dashboard.goalProgress", {
                    name: goal.name,
                    percent: percent.format(target > 0 ? current / target : 0),
                    target: money.format(target),
                  })
            }
          />
        );
      })}
    </ul>
  );
}
