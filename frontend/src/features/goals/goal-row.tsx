import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useUpdateGoalEndpoint } from "@/api/generated";
import type { GoalResponse } from "@/api/generated/model";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDate, useMoney } from "@/hooks/use-formatters";

interface Props {
  goal: GoalResponse;
  onDelete: () => void;
  deletePending: boolean;
  onSaved: () => void;
}

export function GoalRow({ goal, onDelete, deletePending, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const date = useDate();
  const [editing, setEditing] = useState(false);
  const [currentAmount, setCurrentAmount] = useState(goal.currentAmount ?? "0.00");

  const updateMutation = useUpdateGoalEndpoint({
    mutation: {
      onSuccess: () => setEditing(false),
      onSettled: onSaved,
    },
  });

  const target = Number(goal.targetAmount);
  const current = Number(goal.currentAmount);
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;

  return (
    <li className="space-y-2 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{goal.name}</p>
          {goal.targetDate ? (
            <p className="text-xs text-muted-foreground">
              {t("goals.targetDate")}: {date.format(new Date(goal.targetDate))}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          {editing ? (
            <>
              <Input
                className="w-28"
                inputMode="decimal"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
              />
              <Button
                size="sm"
                disabled={updateMutation.isPending}
                onClick={() =>
                  updateMutation.mutate({
                    id: goal.id!,
                    data: {
                      name: goal.name!,
                      targetAmount: goal.targetAmount!,
                      currentAmount,
                      targetDate: goal.targetDate,
                    },
                  })
                }
              >
                {t("actions.save")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                {t("actions.cancel")}
              </Button>
            </>
          ) : (
            <>
              <span className="text-sm font-semibold tabular-nums">
                {money.format(current)} / {money.format(target)}
              </span>
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                {t("goals.updateProgress")}
              </Button>
              <Button variant="ghost" size="sm" disabled={deletePending} onClick={onDelete}>
                {t("actions.delete")}
              </Button>
            </>
          )}
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-secondary" style={{ width: `${pct}%` }} />
      </div>
    </li>
  );
}
