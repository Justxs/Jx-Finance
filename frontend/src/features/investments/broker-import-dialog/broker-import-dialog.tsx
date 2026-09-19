import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { AccountResponse } from "@/api/generated/model";
import { Modal } from "@/components/modal";
import { QueryBoundary } from "@/components/query-boundary";
import { SelectField } from "@/components/select-field";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { defaultInvestmentAccount } from "../investment-types";
import { ConnectionPanel } from "./connection-panel";
import { FlexQueryHelp } from "./flex-query-help";
import { UploadPanel } from "./upload-panel";
import {
  type BrokerImportMutations,
  useBrokerImportMutations,
} from "./use-broker-import-mutations";

export type BrokerImportTab = "upload" | "sync";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: readonly AccountResponse[];
  accountId?: string;
  initialTab?: BrokerImportTab;
}

interface ContentProps extends Pick<Props, "accounts" | "accountId" | "initialTab"> {
  mutations: BrokerImportMutations;
}

function BrokerImportContent({
  accounts,
  accountId,
  initialTab = "upload",
  mutations,
}: Readonly<ContentProps>) {
  const { t } = useTranslation();
  const [selectedAccountId, setSelectedAccountId] = useState(
    () => defaultInvestmentAccount(accounts, accountId)?.id ?? "",
  );

  if (accounts.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("investments.import.noAccounts")}</p>;
  }

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="broker-import-account">{t("investments.import.account")}</Label>
        <SelectField
          id="broker-import-account"
          value={selectedAccountId}
          disabled={mutations.busy}
          aria-describedby="broker-import-account-hint"
          onChange={setSelectedAccountId}
          options={accounts.map((account) => ({ value: account.id, label: account.name }))}
        />
        <p id="broker-import-account-hint" className="text-xs text-muted-foreground">
          {t("investments.import.accountHint")}
        </p>
      </div>

      <Tabs defaultValue={initialTab} className="mt-5">
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

function BrokerImportSession({
  open,
  onOpenChange,
  accounts,
  accountId,
  initialTab,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const mutations = useBrokerImportMutations();

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (next || !mutations.busy) {
          onOpenChange(next);
        }
      }}
      title={t("investments.import.title")}
      description={t("investments.import.description")}
      className="sm:max-w-xl"
    >
      <BrokerImportContent
        accounts={accounts}
        accountId={accountId}
        initialTab={initialTab}
        mutations={mutations}
      />
    </Modal>
  );
}

export function BrokerImportDialog(props: Readonly<Props>) {
  const [session, setSession] = useState(0);
  const [wasOpen, setWasOpen] = useState(props.open);

  if (wasOpen !== props.open) {
    setWasOpen(props.open);
    if (props.open) {
      setSession((current) => current + 1);
    }
  }

  return <BrokerImportSession key={session} {...props} />;
}
