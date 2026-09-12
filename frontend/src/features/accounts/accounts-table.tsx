import { type ReactNode } from "react";
import { Archive, Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useGetHouseholdsEndpoint } from "@/api/generated";
import type { AccountResponse } from "@/api/generated/model";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useMoney } from "@/hooks/use-formatters";
import { AccountTypeIcon } from "@/lib/account-icons";
import { AccountForm, type AccountFormValues } from "./account-form";

interface Props {
  accounts: AccountResponse[];
  isPending: boolean;
  editingId: string | null;
  onEdit: (id: string) => void;
  onCancelEdit: () => void;
  updatePending: boolean;
  onUpdate: (id: string, values: AccountFormValues) => void;
  deletePending: boolean;
  onDelete: (id: string) => void;
}

export function AccountsTable({
  accounts,
  isPending,
  editingId,
  onEdit,
  onCancelEdit,
  updatePending,
  onUpdate,
  deletePending,
  onDelete,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const households = useGetHouseholdsEndpoint();
  const householdNames = new Map(households.data?.map((h) => [h.id, h.name]) ?? []);

  const editingAccount = accounts.find((account) => account.id === editingId);

  let body: ReactNode;
  if (isPending) {
    body = Array.from({ length: 3 }, (_, index) => (
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
  } else if (accounts.length === 0) {
    body = (
      <tr>
        <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
          {t("accounts.empty")}
        </td>
      </tr>
    );
  } else {
    body = accounts.map((account) => (
      <tr key={account.id} className="border-b last:border-0 hover:bg-muted/30">
        <td className="px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <AccountTypeIcon type={account.type ?? "other"} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{account.name}</p>
                {account.scope === "shared" ? (
                  <span className="rounded-full bg-secondary/60 px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                    {t("sharing.sharedWith", {
                      household: householdNames.get(account.householdId ?? "") ?? "",
                    })}
                  </span>
                ) : null}
              </div>
              {account.description ? (
                <p className="mt-0.5 text-xs text-muted-foreground">{account.description}</p>
              ) : null}
            </div>
          </div>
        </td>
        <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{account.iban || "—"}</td>
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
              onClick={() => onEdit(account.id!)}
              aria-label={t("actions.edit")}
              title={t("actions.edit")}
            >
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              disabled={deletePending}
              onClick={() => onDelete(account.id!)}
              aria-label={t("actions.archive")}
              title={t("actions.archive")}
            >
              <Archive />
            </Button>
          </div>
        </td>
      </tr>
    ));
  }

  return (
    <>
      <section className="card overflow-hidden">
        <div
          className="overflow-x-auto"
          role="region"
          aria-label={t("accounts.title")}
          tabIndex={0}
        >
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-6 py-3 text-xs font-medium tracking-wide text-muted-foreground">
                  {t("accounts.name")}
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wide text-muted-foreground">
                  {t("accounts.iban")}
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wide text-muted-foreground">
                  {t("accounts.type")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium tracking-wide text-muted-foreground">
                  {t("accounts.startingBalance")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium tracking-wide text-muted-foreground">
                  {t("accounts.currentBalance")}
                </th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>{body}</tbody>
          </table>
        </div>
      </section>
      <Dialog
        open={!!editingAccount}
        onOpenChange={(open) => {
          if (!open) onCancelEdit();
        }}
        title={t("actions.edit")}
      >
        {editingAccount ? (
          <AccountForm
            initial={editingAccount}
            pending={updatePending}
            onSubmit={(values) => onUpdate(editingAccount.id!, values)}
            onCancel={onCancelEdit}
          />
        ) : null}
      </Dialog>
    </>
  );
}
