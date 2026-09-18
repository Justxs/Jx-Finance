import { type ReactNode, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  getGetCategoriesEndpointQueryKey,
  getGetTransactionsEndpointQueryKey,
  useDeleteCategoryEndpoint,
  useGetCategoriesEndpointSuspense,
} from "@/api/generated";
import type { FlowType } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { AddCategoryForm } from "./add-category-form";
import { CategoryRow } from "./category-row";

export function CategoriesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);

  const categories = useGetCategoriesEndpointSuspense();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getGetCategoriesEndpointQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetTransactionsEndpointQueryKey() });
  }

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const deleteMutation = useDeleteCategoryEndpoint({
    mutation: {
      onSuccess: () => toast.success(t("categories.deleted")),
      onSettled: invalidate,
    },
  });

  const categoryList = categories.data ?? [];
  const deletingId = deleteMutation.isPending ? deleteMutation.variables?.id : undefined;
  const groups: { type: FlowType; labelKey: string }[] = [
    { type: "income", labelKey: "categories.income" },
    { type: "expense", labelKey: "categories.expense" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t("categories.title")}>
        <Button onClick={() => setAddOpen(true)}>
          <Plus />
          {t("categories.add")}
        </Button>
      </PageHeader>

      <Dialog open={addOpen} onOpenChange={setAddOpen} title={t("categories.addTitle")}>
        <AddCategoryForm
          onCreated={() => {
            invalidate();
            setAddOpen(false);
          }}
          onCancel={() => setAddOpen(false)}
        />
      </Dialog>

      <div className="grid gap-6 lg:grid-cols-2">
        {groups.map((group) => {
          const items = categoryList.filter((c) => c.type === group.type);

          let groupContent: ReactNode;
          if (items.length === 0) {
            groupContent = (
              <p className="px-6 py-6 text-sm text-muted-foreground">{t("categories.empty")}</p>
            );
          } else {
            groupContent = (
              <ul className="divide-y divide-border px-6">
                {items.map((category) => (
                  <CategoryRow
                    key={category.id}
                    category={category}
                    onDelete={() => setDeleteTarget(category.id!)}
                    deletePending={deletingId === category.id}
                    deleteDisabled={deleteMutation.isPending}
                    onSaved={invalidate}
                  />
                ))}
              </ul>
            );
          }

          return (
            <section key={group.type} className="card">
              <div className="flex items-center justify-between border-b px-6 py-4">
                <h2 className="font-semibold">{t(group.labelKey)}</h2>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {items.length}
                </span>
              </div>
              {groupContent}
            </section>
          );
        })}
      </div>
      <ConfirmDeleteDialog
        target={deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={(id) => deleteMutation.mutate({ id })}
      />
    </div>
  );
}
