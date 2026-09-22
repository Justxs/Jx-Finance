import { Plus } from "lucide-react";
import { type ReactNode, useState, useDeferredValue } from "react";
import { useTranslation } from "react-i18next";
import {
  getGoalsQueryKey,
  useAccountsSuspense,
  useDeleteGoal,
  useGoalsSuspense,
} from "@/api/generated";
import type { GoalResponse } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header/page-header";
import { Button } from "@/components/ui/button/button";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import { Panel } from "@/components/ui/section/section";
import { useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { optimisticRemoval } from "@/lib/optimistic";
import { nameById } from "@/lib/options";
import { CreateGoalForm } from "../create-goal-form/create-goal-form";
import { GoalRow } from "../goal-row/goal-row";

export function GoalsPage() {
  const { t } = useTranslation();
  const [addOpen, setAddOpen] = useState(false);

  const accounts = useAccountsSuspense();
  const goals = useGoalsSuspense();

  const deleteMutation = useDeleteGoal({
    mutation: optimisticRemoval<GoalResponse>(getGoalsQueryKey()),
  });

  const accountList = accounts.data ?? [];
  const accountNames = nameById(accountList);
  const goalList = useDeferredValue(goals.data) ?? [];
  const remove = useConfirmedDelete(deleteMutation, goalList, (goal) => goal.name, "goal");

  let content: ReactNode;
  if (goalList.length === 0) {
    content = <EmptyText>{t("goals.empty")}</EmptyText>;
  } else {
    content = (
      <Panel as={Rows} className="py-2 sm:py-3">
        {goalList.map((goal) => (
          <GoalRow
            key={goal.id}
            goal={goal}
            accounts={accountList}
            accountNames={accountNames}
            onDelete={() => remove.request(goal.id)}
            deletePending={remove.pendingId === goal.id}
            deleteDisabled={remove.busy}
          />
        ))}
      </Panel>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title={t("goals.title")}>
        <Button onClick={() => setAddOpen(true)}>
          <Plus />
          {t("goals.add")}
        </Button>
      </PageHeader>

      <Modal open={addOpen} onOpenChange={setAddOpen} title={t("goals.add")}>
        <CreateGoalForm
          accounts={accountList}
          onCreated={() => setAddOpen(false)}
          onCancel={() => setAddOpen(false)}
        />
      </Modal>

      {content}
      <ConfirmDeleteDialog {...remove.dialogProps} />
    </div>
  );
}
