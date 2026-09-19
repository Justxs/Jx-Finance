import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { type ReactNode, useState, useDeferredValue } from "react";
import { useTranslation } from "react-i18next";
import { getGoalsQueryKey, useDeleteGoal, useGoalsSuspense } from "@/api/generated";
import type { GoalResponse } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { optimisticRemoval } from "@/lib/optimistic";
import { CreateGoalForm } from "../create-goal-form";
import { GoalRow } from "../goal-row";

export function GoalsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);

  const goals = useGoalsSuspense();

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const deleteMutation = useDeleteGoal({
    mutation: optimisticRemoval<GoalResponse>(queryClient, getGoalsQueryKey()),
  });

  const goalList = useDeferredValue(goals.data) ?? [];

  const deletingId = deleteMutation.isPending ? deleteMutation.variables?.id : undefined;

  let content: ReactNode;
  if (goalList.length === 0) {
    content = <p className="py-6 text-sm text-muted-foreground">{t("goals.empty")}</p>;
  } else {
    content = (
      <ul className="rows border-t border-t-rule">
        {goalList.map((goal) => (
          <GoalRow
            key={goal.id}
            goal={goal}
            onDelete={() => setDeleteTarget(goal.id)}
            deletePending={deletingId === goal.id}
            deleteDisabled={deleteMutation.isPending}
          />
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-10">
      <PageHeader title={t("goals.title")}>
        <Button onClick={() => setAddOpen(true)}>
          <Plus />
          {t("goals.add")}
        </Button>
      </PageHeader>

      <Modal open={addOpen} onOpenChange={setAddOpen} title={t("goals.add")}>
        <CreateGoalForm onCreated={() => setAddOpen(false)} onCancel={() => setAddOpen(false)} />
      </Modal>

      {content}
      <ConfirmDeleteDialog
        target={deleteTarget}
        itemLabel={goalList.find((goal) => goal.id === deleteTarget)?.name ?? undefined}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={(id) => deleteMutation.mutate({ id })}
      />
    </div>
  );
}
