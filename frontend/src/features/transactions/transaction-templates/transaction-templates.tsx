import { NotebookPen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SavedListMenu } from "@/features/transactions/saved-list-menu/saved-list-menu";
import {
  type TransactionDraft,
  draftFromTemplate,
} from "@/features/transactions/transaction-form/transaction-draft";
import { transactionTemplates } from "@/features/transactions/transaction-views";

interface Props {
  onUse: (draft: TransactionDraft) => void;
}

export function TransactionTemplates({ onUse }: Readonly<Props>) {
  const { t } = useTranslation();
  const templates = transactionTemplates.useRows();

  return (
    <SavedListMenu
      icon={NotebookPen}
      label={t("transactions.templates")}
      items={templates.map((template) => ({ id: template.id, name: template.name }))}
      emptyText={t("transactions.templatesEmpty")}
      applyHint={t("transactions.useTemplate")}
      onApply={(id) => {
        const template = templates.find((candidate) => candidate.id === id);
        if (template) {
          onUse(draftFromTemplate(template.values));
        }
      }}
      onRename={transactionTemplates.rename}
      onDelete={transactionTemplates.remove}
    />
  );
}
