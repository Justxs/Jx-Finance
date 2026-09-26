import { type ReactNode, useDeferredValue, useState } from "react";
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
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import { Section } from "@/components/ui/section/section";
import { useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { optimisticRemoval } from "@/lib/optimistic";
import { nameById } from "@/lib/options";
import { CreateGoalForm } from "../create-goal-form/create-goal-form";
import { GoalRow } from "../goal-row/goal-row";

export function GoalsPage() {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<GoalResponse | null>(null);

  const accounts = useAccountsSuspense();
  const goals = useGoalsSuspense();

  const deleteMutation = useDeleteGoal({
    mutation: optimisticRemoval<GoalResponse>(getGoalsQueryKey()),
  });

  const accountList = accounts.data;
  const accountNames = nameById(accountList);
  const goalList = useDeferredValue(goals.data);
  const remove = useConfirmedDelete(deleteMutation, goalList, (goal) => goal.name, "goal");

  let content: ReactNode;
  if (goalList.length === 0) {
    content = <EmptyText>{t("goals.empty")}</EmptyText>;
  } else {
    content = (
      <Section as={Rows} className="py-2 sm:py-3">
        {goalList.map((goal) => (
          <GoalRow
            key={goal.id}
            goal={goal}
            accountNames={accountNames}
            onEdit={() => setEditing(goal)}
            {...remove.deleteProps(goal.id)}
          />
        ))}
      </Section>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title={t("goals.title")}>
        <CreateDialog label={t("goals.add")} title={t("goals.add")}>
          {(close) => <CreateGoalForm accounts={accountList} onClose={close} />}
        </CreateDialog>
      </PageHeader>

      {content}
      <EditModal item={editing} title={t("actions.edit")} onClose={() => setEditing(null)}>
        {(goal, close) => <CreateGoalForm initial={goal} accounts={accountList} onClose={close} />}
      </EditModal>
      <ConfirmDeleteDialog {...remove.dialogProps} />
    </div>
  );
}
