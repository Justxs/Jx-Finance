import { type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  getGetCategoriesEndpointQueryKey,
  getGetTransactionsEndpointQueryKey,
  useDeleteCategoryEndpoint,
  useGetCategoriesEndpoint,
} from "@/api/generated";
import type { FlowType } from "@/api/generated/model";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { AddCategoryForm } from "./add-category-form";
import { CategoryRow } from "./category-row";

export function CategoriesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const categories = useGetCategoriesEndpoint();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getGetCategoriesEndpointQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetTransactionsEndpointQueryKey() });
  }

  const deleteMutation = useDeleteCategoryEndpoint({
    mutation: {
      onSuccess: () => toast.success(t("categories.deleted")),
      onSettled: invalidate,
    },
  });

  const categoryList = categories.data ?? [];
  const groups: { type: FlowType; labelKey: string }[] = [
    { type: "income", labelKey: "categories.income" },
    { type: "expense", labelKey: "categories.expense" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title={t("categories.title")} subtitle={t("categories.subtitle")} />

      <section className="card p-6">
        <h2 className="mb-5 font-semibold">{t("categories.add")}</h2>
        <AddCategoryForm onCreated={invalidate} />
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {groups.map((group) => {
          const items = categoryList.filter((c) => c.type === group.type);

          let groupContent: ReactNode;
          if (categories.isPending) {
            groupContent = (
              <ul className="divide-y divide-border px-6">
                {Array.from({ length: 3 }, (_, index) => (
                  <li key={index} className="flex items-center gap-3 py-2.5">
                    <Skeleton className="size-8 shrink-0 rounded-full" />
                    <Skeleton className="h-4 w-28" />
                  </li>
                ))}
              </ul>
            );
          } else if (items.length === 0) {
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
                    onDelete={() => deleteMutation.mutate({ id: category.id! })}
                    deletePending={deleteMutation.isPending}
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
    </div>
  );
}
