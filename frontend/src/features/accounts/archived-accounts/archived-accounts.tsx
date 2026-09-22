import { Undo2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  useArchivedAccountsSuspense,
  useHouseholdsSuspense,
  useRestoreAccount,
} from "@/api/generated";
import type { ArchivedAccountResponse } from "@/api/generated/model";
import { RowTransition } from "@/components/row-transition/row-transition";
import { SharedScopeTag } from "@/components/shared-scope-tag/shared-scope-tag";
import { Button } from "@/components/ui/button/button";
import { Rows } from "@/components/ui/rows/rows";
import { Section } from "@/components/ui/section/section";
import { useDate, useMoney } from "@/hooks/use-formatters";
import { AccountTypeIcon } from "@/lib/account-icons";
import { pendingId } from "@/lib/mutations";
import { nameById } from "@/lib/options";
import { metaLine } from "@/lib/utils";

interface ListProps {
  accounts: readonly ArchivedAccountResponse[];
  householdNames: ReadonlyMap<string, string>;
  restoringId: string | null;
  onRestore: (id: string) => void;
}

export function ArchivedAccountsList({
  accounts,
  householdNames,
  restoringId,
  onRestore,
}: Readonly<ListProps>) {
  const { t } = useTranslation();
  const money = useMoney();
  const date = useDate();

  return (
    <Rows aria-label={t("accounts.archivedList.label")}>
      {accounts.map((account) => {
        const details = metaLine(
          t(`accounts.types.${account.type}`),
          money.format(Number(account.startingBalance), account.currency),
          account.iban,
          t("accounts.archivedList.archivedOn", {
            date: date.format(new Date(account.archivedAt)),
          }),
        );

        return (
          <RowTransition key={account.id}>
            <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-2.5">
                <AccountTypeIcon
                  type={account.type}
                  className="mt-0.5 shrink-0 text-muted-foreground"
                />
                <div className="min-w-0 space-y-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium wrap-break-word">
                    {account.name}
                    <SharedScopeTag
                      scope={account.scope}
                      householdName={householdNames.get(account.householdId ?? "")}
                    />
                  </p>
                  <p className="text-xs wrap-break-word text-muted-foreground tabular-nums">
                    {details}
                  </p>
                </div>
              </div>
              {account.canRestore ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="self-start sm:self-auto"
                  pending={restoringId === account.id}
                  disabled={restoringId !== null}
                  onClick={() => onRestore(account.id)}
                  aria-label={`${t("accounts.archivedList.restore")}: ${account.name}`}
                >
                  <Undo2 />
                  {t("accounts.archivedList.restore")}
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground sm:text-right">
                  {t("accounts.archivedList.ownerOnly")}
                </p>
              )}
            </li>
          </RowTransition>
        );
      })}
    </Rows>
  );
}

export function ArchivedAccounts() {
  const { t } = useTranslation();
  const archived = useArchivedAccountsSuspense();
  const households = useHouseholdsSuspense();
  const restoreMutation = useRestoreAccount({
    mutation: { onSuccess: () => toast.success(t("accounts.restored")) },
  });
  const restoringId = pendingId(restoreMutation);
  const accounts = archived.data;

  if (accounts.length === 0) {
    return null;
  }

  return (
    <Section>
      <details className="group">
        <summary className="w-fit cursor-pointer rounded-sm py-1 text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
          {t("accounts.archivedList.summary", { count: accounts.length })}
        </summary>
        <div className="mt-2">
          <ArchivedAccountsList
            accounts={accounts}
            householdNames={nameById(households.data)}
            restoringId={restoringId}
            onRestore={(id) => restoreMutation.mutate({ id })}
          />
        </div>
      </details>
    </Section>
  );
}
