import { useTranslation } from "react-i18next";
import {
  getGoalsQueryKey,
  useAccountsSuspense,
  useDeleteGoal,
  useGoalsSuspense,
} from "@/api/generated";
import type { GoalResponse } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { CreateDialog } from "@/components/create-dialog/create-dialog";
import { EditModal } from "@/components/modal";
import { PageHeader } from "@/components/page-header/page-header";
import { PanelRows } from "@/components/panel-rows/panel-rows";
import { GoalForm } from "@/features/goals/goal-form/goal-form";
import { GoalRow } from "@/features/goals/goal-row/goal-row";
import { useEditableList } from "@/hooks/use-editable-list";
import { optimisticRemoval } from "@/lib/optimistic";
import { nameById } from "@/lib/options";

export function GoalsPage() {
  const { t } = useTranslation();
  const accountList = useAccountsSuspense().data;
  const accountNames = nameById(accountList);
  const goals = useEditableList(
    useGoalsSuspense().data,
    useDeleteGoal({ mutation: optimisticRemoval<GoalResponse>(getGoalsQueryKey()) }),
    (goal) => goal.name,
    "goal",
  );

  return (
    <div className="space-y-5">
      <PageHeader title={t("goals.title")}>
        <CreateDialog label={t("goals.add")} title={t("goals.add")}>
          {(close) => <GoalForm accounts={accountList} onClose={close} />}
        </CreateDialog>
      </PageHeader>

      <PanelRows count={goals.list.length} emptyText={t("goals.empty")}>
        {goals.list.map((goal) => (
          <GoalRow
            key={goal.id}
            goal={goal}
            accountNames={accountNames}
            {...goals.rowProps(goal)}
          />
        ))}
      </PanelRows>
      <EditModal
        {...goals.editProps}
        title={t("goals.editTitle")}
        description={(goal) => goal.name}
      >
        {(goal, close) => <GoalForm initial={goal} accounts={accountList} onClose={close} />}
      </EditModal>
      <ConfirmDeleteDialog {...goals.dialogProps} />
    </div>
  );
}
