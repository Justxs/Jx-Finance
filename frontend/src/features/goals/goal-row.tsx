import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useUpdateGoalEndpoint } from "@/api/generated";
import type { GoalResponse } from "@/api/generated/model";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { isPositiveMoney, isMoney, normalizeMoney } from "@/lib/validation";
import { Label } from "@/components/ui/label";
import { useIsoDate, useMoney } from "@/hooks/use-formatters";

interface Props {
  goal: GoalResponse;
  onDelete: () => void;
  deletePending: boolean;
  deleteDisabled: boolean;
  onSaved: () => void;
}

export function GoalRow({
  goal,
  onDelete,
  deletePending,
  deleteDisabled,
  onSaved,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const formatDate = useIsoDate();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(goal.name ?? "");
  const [targetAmount, setTargetAmount] = useState(goal.targetAmount ?? "");
  const [targetDate, setTargetDate] = useState(goal.targetDate ?? "");
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 break-words">
          <p className="font-medium">{goal.name}</p>
          {goal.targetDate ? (
            <p className="text-xs text-muted-foreground">
              {t("goals.targetDate")}: {formatDate(goal.targetDate)}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="break-words text-sm font-semibold tabular-nums">
            {money.format(current)} / {money.format(target)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => {
              setName(goal.name ?? "");
              setTargetAmount(goal.targetAmount ?? "");
              setTargetDate(goal.targetDate ?? "");
              setCurrentAmount(goal.currentAmount ?? "0.00");
              setEditing(true);
            }}
            aria-label={t("actions.edit")}
            title={t("actions.edit")}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            pending={deletePending}
            disabled={deleteDisabled}
            onClick={onDelete}
            aria-label={t("actions.delete")}
            title={t("actions.delete")}
          >
            <Trash2 />
          </Button>
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-secondary" style={{ width: `${pct}%` }} />
      </div>

      <Dialog open={editing} onOpenChange={setEditing} title={t("actions.edit")}>
        <div className="space-y-4">
          <Label htmlFor={`goal-name-${goal.id}`}>{t("goals.name")}</Label>
          <Input
            id={`goal-name-${goal.id}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Label htmlFor={`goal-target-${goal.id}`}>{t("goals.targetAmount")}</Label>
          <Input
            id={`goal-target-${goal.id}`}
            inputMode="decimal"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
          />
          <Label htmlFor={`goal-date-${goal.id}`}>{t("goals.targetDate")}</Label>
          <Input
            id={`goal-date-${goal.id}`}
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
          <div className="space-y-1.5">
            <Label htmlFor={`goal-current-${goal.id}`}>{t("goals.currentAmount")}</Label>
            <Input
              id={`goal-current-${goal.id}`}
              inputMode="decimal"
              value={currentAmount}
              onChange={(e) => setCurrentAmount(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={updateMutation.isPending}
              onClick={() => setEditing(false)}
            >
              {t("actions.cancel")}
            </Button>
            <Button
              pending={updateMutation.isPending}
              disabled={
                !name.trim() ||
                !isPositiveMoney(targetAmount) ||
                !isMoney(currentAmount) ||
                Number(normalizeMoney(currentAmount)) < 0
              }
              onClick={() =>
                updateMutation.mutate({
                  id: goal.id!,
                  data: {
                    name,
                    targetAmount,
                    currentAmount,
                    targetDate: targetDate || null,
                  },
                })
              }
            >
              {t("actions.save")}
            </Button>
          </div>
        </div>
      </Dialog>
    </li>
  );
}
