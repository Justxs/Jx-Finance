import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { AccountResponse, GoalResponse } from "@/api/generated/model";
import { Modal } from "@/components/modal";
import { RowTransition } from "@/components/row-transition/row-transition";
import { Button } from "@/components/ui/button/button";
import { Meter } from "@/components/ui/meter/meter";
import { Tag } from "@/components/ui/tag/tag";
import { useIsoDate, useMoney, usePercent } from "@/hooks/use-formatters";
import { CreateGoalForm } from "../create-goal-form/create-goal-form";

interface Props {
  goal: GoalResponse;
  accounts: AccountResponse[];
  accountNames: ReadonlyMap<string, string>;
  onDelete: () => void;
  deletePending: boolean;
  deleteDisabled: boolean;
}

export function GoalRow({
  goal,
  accounts,
  accountNames,
  onDelete,
  deletePending,
  deleteDisabled,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const formatDate = useIsoDate();
  const percent = usePercent();
  const [editing, setEditing] = useState(false);

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
    <RowTransition>
      <li className="py-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
          <div className="min-w-0">
            <p className="line-clamp-2 font-medium wrap-break-word" title={goal.name ?? undefined}>
              {goal.name}
            </p>
            {goal.targetDate ? (
              <p className="text-xs text-muted-foreground tabular-nums">
                {t("goals.targetDate")}: {formatDate(goal.targetDate)}
              </p>
            ) : null}
            {source ? (
              <p className="text-xs wrap-break-word text-muted-foreground">{source}</p>
            ) : null}
          </div>
          <div className="col-span-2 row-start-2 min-w-0 text-sm sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:text-right">
            {current === null ? (
              <>
                <p className="whitespace-nowrap">
                  <Tag tone="neutral">{t("goals.progressUnavailable")}</Tag>
                </p>
                <p className="text-xs wrap-break-word text-muted-foreground">
                  {t("goals.progressUnavailableHint")}
                </p>
              </>
            ) : (
              <>
                <p className="whitespace-nowrap tabular-nums">
                  <span className="font-semibold">{money.format(current)}</span>{" "}
                  <span className="text-muted-foreground">
                    {t("goals.ofTarget", { amount: money.format(target) })}
                  </span>
                </p>
                <p className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums sm:justify-end">
                  {percent.format(target > 0 ? current / target : 0)}
                  {reached ? <Tag tone="positive">{t("goals.reached")}</Tag> : null}
                </p>
              </>
            )}
          </div>
          <div className="col-start-2 row-start-1 flex items-center sm:col-start-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditing(true)}
              aria-label={`${t("actions.edit")}: ${goal.name}`}
            >
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              pending={deletePending}
              disabled={deleteDisabled}
              onClick={onDelete}
              aria-label={`${t("actions.delete")}: ${goal.name}`}
            >
              <Trash2 />
            </Button>
          </div>
        </div>
        {current === null ? null : (
          <Meter
            value={current}
            max={target}
            tone="positive"
            label={goal.name ?? undefined}
            className="mt-2"
          />
        )}

        <Modal open={editing} onOpenChange={setEditing} title={t("actions.edit")}>
          <CreateGoalForm
            initial={goal}
            accounts={accounts}
            onCreated={() => setEditing(false)}
            onCancel={() => setEditing(false)}
          />
        </Modal>
      </li>
    </RowTransition>
  );
}
