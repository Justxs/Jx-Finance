import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { AccountResponse } from "@/api/generated/model";
import { FieldShell } from "@/components/form/field-shell/field-shell";
import { Modal } from "@/components/modal";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { SelectField } from "@/components/select-field/select-field";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs/tabs";
import { namedOptions } from "@/lib/options";
import { defaultInvestmentAccount } from "../investment-types";
import { ConnectionPanel } from "./connection-panel";
import { FlexQueryHelp } from "./flex-query-help";
import { UploadPanel } from "./upload-panel";
import { useBrokerImportBusy, useBrokerImportMutations } from "./use-broker-import-mutations";

type BrokerImportTab = "upload" | "sync";

function isBrokerImportTab(value: unknown): value is BrokerImportTab {
  return value === "upload" || value === "sync";
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: readonly AccountResponse[];
  accountId?: string;
  initialTab?: BrokerImportTab;
}

type ContentProps = Pick<Props, "accounts" | "accountId" | "initialTab">;

function BrokerImportContent({
  accounts,
  accountId,
  initialTab = "upload",
}: Readonly<ContentProps>) {
  const { t } = useTranslation();
  const mutations = useBrokerImportMutations();
  const [selectedAccountId, setSelectedAccountId] = useState(
    () => defaultInvestmentAccount(accounts, accountId)?.id ?? "",
  );
  const [tab, setTab] = useState<BrokerImportTab>(initialTab);

  if (accounts.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("investments.import.noAccounts")}</p>;
  }

  return (
    <>
      <FieldShell
        id="broker-import-account"
        label={t("investments.import.account")}
        hint={t("investments.import.accountHint")}
      >
        <SelectField
          id="broker-import-account"
          value={selectedAccountId}
          disabled={mutations.busy}
          aria-describedby="broker-import-account-hint"
          onChange={setSelectedAccountId}
          options={namedOptions(accounts)}
        />
      </FieldShell>

      <Tabs
        value={tab}
        onValueChange={(next: unknown) => {
          if (isBrokerImportTab(next)) {
            setTab(next);
          }
        }}
        className="mt-5"
      >
        <TabsList>
          <TabsTab value="upload" disabled={mutations.busy}>
            {t("investments.import.tabs.upload")}
          </TabsTab>
          <TabsTab value="sync" disabled={mutations.busy}>
            {t("investments.import.tabs.sync")}
          </TabsTab>
        </TabsList>
        <TabsPanel value="upload" keepMounted>
          <UploadPanel
            key={selectedAccountId}
            accounts={accounts}
            accountId={selectedAccountId}
            mutations={mutations}
          />
        </TabsPanel>
        <TabsPanel value="sync" keepMounted>
          <QueryBoundary fallback={<Skeleton className="h-56 w-full" />}>
            <ConnectionPanel
              accounts={accounts}
              accountId={selectedAccountId}
              mutations={mutations}
            />
          </QueryBoundary>
        </TabsPanel>
      </Tabs>

      <FlexQueryHelp />
    </>
  );
}

export function BrokerImportDialog({
  open,
  onOpenChange,
  accounts,
  accountId,
  initialTab,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const busy = useBrokerImportBusy();

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (next || !busy) {
          onOpenChange(next);
        }
      }}
      title={t("investments.import.title")}
      description={t("investments.import.description")}
      className="sm:max-w-xl"
    >
      <BrokerImportContent accounts={accounts} accountId={accountId} initialTab={initialTab} />
    </Modal>
  );
}
