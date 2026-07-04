import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Archive, Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  getGetAccountsEndpointQueryKey,
  getGetDashboardSummaryEndpointQueryKey,
  useCreateAccountEndpoint,
  useDeleteAccountEndpoint,
  useGetAccountsEndpoint,
  useUpdateAccountEndpoint,
} from "@/api/generated";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMoney } from "@/hooks/use-formatters";
import { AccountTypeIcon } from "@/lib/account-icons";
import { AccountForm } from "./account-form";

export function AccountsPage() {
  const { t } = useTranslation();
  const money = useMoney();
  const queryClient = useQueryClient();

  const accounts = useGetAccountsEndpoint();
  const [editingId, setEditingId] = useState<string | null>(null);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getGetAccountsEndpointQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryEndpointQueryKey() });
  }

  const createMutation = useCreateAccountEndpoint({ mutation: { onSettled: invalidate } });
  const updateMutation = useUpdateAccountEndpoint({
    mutation: {
      onSuccess: () => setEditingId(null),
      onSettled: invalidate,
    },
  });
  const deleteMutation = useDeleteAccountEndpoint({
    mutation: {
      onSuccess: () => toast.success(t("accounts.archived")),
      onSettled: invalidate,
    },
  });

  const accountList = accounts.data ?? [];

  let tableBody: ReactNode;
  if (accounts.isPending) {
    tableBody = Array.from({ length: 3 }, (_, index) => (
      <tr key={index} className="border-b last:border-0">
        <td colSpan={6} className="px-6 py-3.5">
          <div className="flex items-center gap-4">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-20" />
          </div>
        </td>
      </tr>
    ));
  } else if (accountList.length === 0) {
    tableBody = (
      <tr>
        <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
          {t("accounts.empty")}
        </td>
      </tr>
    );
  } else {
    tableBody = accountList.map((account) =>
      editingId === account.id ? (
        <tr key={account.id} className="border-b last:border-0">
          <td colSpan={6} className="bg-muted/30 px-6 py-4">
            <AccountForm
              initial={account}
              pending={updateMutation.isPending}
              onSubmit={(values) => updateMutation.mutate({ id: account.id!, data: values })}
              onCancel={() => setEditingId(null)}
            />
          </td>
        </tr>
      ) : (
        <tr key={account.id} className="border-b last:border-0 hover:bg-muted/30">
          <td className="px-6 py-3">
            <div className="flex items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <AccountTypeIcon type={account.type ?? "other"} />
              </span>
              <div>
                <p className="font-medium">{account.name}</p>
                {account.description ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">{account.description}</p>
                ) : null}
              </div>
            </div>
          </td>
          <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
            {account.iban || "—"}
          </td>
          <td className="px-6 py-3">
            <span className="inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {t(`accounts.types.${account.type}`)}
            </span>
          </td>
          <td className="px-6 py-3 text-right tabular-nums text-muted-foreground">
            {money.format(Number(account.startingBalance))}
          </td>
          <td className="px-6 py-3 text-right font-semibold tabular-nums">
            {money.format(Number(account.currentBalance))}
          </td>
          <td className="px-6 py-3">
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setEditingId(account.id!)}
                aria-label={t("actions.edit")}
                title={t("actions.edit")}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate({ id: account.id! })}
                aria-label={t("actions.archive")}
                title={t("actions.archive")}
              >
                <Archive />
              </Button>
            </div>
          </td>
        </tr>
      ),
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title={t("accounts.title")} subtitle={t("accounts.subtitle")} />

      <section className="card p-6">
        <h2 className="mb-5 font-semibold">{t("accounts.add")}</h2>
        <AccountForm
          pending={createMutation.isPending}
          onSubmit={(values) => createMutation.mutate({ data: values })}
        />
      </section>

      <section className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("accounts.name")}
              </th>
              <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("accounts.iban")}
              </th>
              <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("accounts.type")}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("accounts.startingBalance")}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("accounts.currentBalance")}
              </th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody>{tableBody}</tbody>
        </table>
      </section>
    </div>
  );
}
