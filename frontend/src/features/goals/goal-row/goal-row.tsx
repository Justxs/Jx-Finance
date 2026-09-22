import { useTranslation } from "react-i18next";
import type { GoalResponse } from "@/api/generated/model";
import { ProgressAmount, ProgressRow } from "@/components/progress-row/progress-row";
import { Tag } from "@/components/ui/tag/tag";
import { useIsoDate, useMoney, usePercent } from "@/hooks/use-formatters";

interface Props {
  goal: GoalResponse;
  accountNames: ReadonlyMap<string, string>;
  onEdit: () => void;
  onDelete: () => void;
  deletePending: boolean;
  deleteDisabled: boolean;
}

export function GoalRow({
  goal,
  accountNames,
  onEdit,
  onDelete,
  deletePending,
  deleteDisabled,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const formatDate = useIsoDate();
  const percent = usePercent();

  const target = Number(goal.targetAmount);
  const current = goal.progressAmount === null ? null : Number(goal.progressAmount);
  const reached = current !== null && target > 0 && current >= target;

  const accountName =
    accountNames.get(goal.fundingAccountId ?? "") ?? t("goals.unavailableAccount");
  let source: string | null = null;
  if (goal.funding === "account") {
    source =
      goal.fundingSharePercent === 100
        ? t("goals.fundedFrom", { account: accountName })
        : t("goals.fundedShareFrom", { percent: goal.fundingSharePercent, account: accountName });
  }

  return (
    <ProgressRow
      label={goal.name}
      title={goal.name}
      titleHint={goal.name}
      meta={
        <>
          {goal.targetDate ? (
            <p className="text-xs text-muted-foreground tabular-nums">
              {t("goals.targetDate")}: {formatDate(goal.targetDate)}
            </p>
          ) : null}
          {source ? (
            <p className="text-xs wrap-break-word text-muted-foreground">{source}</p>
          ) : null}
        </>
      }
      primary={
        current === null ? (
          <Tag tone="neutral">{t("goals.progressUnavailable")}</Tag>
        ) : (
          <ProgressAmount
            amount={money.format(current)}
            of={t("goals.ofTarget", { amount: money.format(target) })}
          />
        )
      }
      secondary={
        current === null ? (
          <p className="text-xs wrap-break-word text-muted-foreground">
            {t("goals.progressUnavailableHint")}
          </p>
        ) : (
          <p className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums sm:justify-end">
            {percent.format(target > 0 ? current / target : 0)}
            {reached ? <Tag tone="positive">{t("goals.reached")}</Tag> : null}
          </p>
        )
      }
      meter={current === null ? null : { value: current, max: target, tone: "positive" }}
      onEdit={onEdit}
      onDelete={onDelete}
      deletePending={deletePending}
      deleteDisabled={deleteDisabled}
    />
  );
}
