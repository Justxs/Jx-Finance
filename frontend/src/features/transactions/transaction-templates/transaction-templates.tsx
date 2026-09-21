import { NotebookPen } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  deleteTransactionTemplate,
  renameTransactionTemplate,
  useTransactionTemplates,
} from "@/stores/transaction-views";
import { SavedListMenu } from "../saved-list-menu/saved-list-menu";
import { type TransactionDraft, draftFromTemplate } from "../transaction-form";

interface Props {
  onUse: (draft: TransactionDraft) => void;
  className?: string;
  defaultOpen?: boolean;
}

export function TransactionTemplates({ onUse, className, defaultOpen }: Readonly<Props>) {
  const { t } = useTranslation();
  const templates = useTransactionTemplates();

  return (
    <SavedListMenu
      icon={NotebookPen}
      className={className}
      defaultOpen={defaultOpen}
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
      onRename={renameTransactionTemplate}
      onDelete={deleteTransactionTemplate}
    />
  );
}
