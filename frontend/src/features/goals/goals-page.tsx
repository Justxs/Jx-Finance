import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getGetGoalsEndpointQueryKey,
  useDeleteGoalEndpoint,
  useGetGoalsEndpoint,
} from "@/api/generated";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateGoalForm } from "./create-goal-form";
import { GoalRow } from "./goal-row";

export function GoalsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);

  const goals = useGetGoalsEndpoint();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getGetGoalsEndpointQueryKey() });
  }

  const deleteMutation = useDeleteGoalEndpoint({ mutation: { onSettled: invalidate } });

  const goalList = goals.data ?? [];

  let content: ReactNode;
  if (goals.isPending) {
    content = (
      <div className="space-y-4 p-6">
        {Array.from({ length: 2 }, (_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
    );
  } else if (goalList.length === 0) {
    content = <p className="px-6 py-8 text-sm text-muted-foreground">{t("goals.empty")}</p>;
  } else {
    content = (
      <ul className="divide-y divide-border">
        {goalList.map((goal) => (
          <GoalRow
            key={goal.id}
            goal={goal}
            onDelete={() => deleteMutation.mutate({ id: goal.id! })}
            deletePending={deleteMutation.isPending}
            onSaved={invalidate}
          />
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("goals.title")} subtitle={t("goals.subtitle")}>
        <Button onClick={() => setAddOpen(true)}>
          <Plus />
          {t("goals.add")}
        </Button>
      </PageHeader>

      <Dialog open={addOpen} onOpenChange={setAddOpen} title={t("goals.add")}>
        <CreateGoalForm
          onCreated={() => {
            invalidate();
            setAddOpen(false);
          }}
          onCancel={() => setAddOpen(false)}
        />
      </Dialog>

      <section className="card overflow-hidden">{content}</section>
    </div>
  );
}
