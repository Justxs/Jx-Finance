import { Play } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  getCategorizationRulesQueryKey,
  useAccountsSuspense,
  useCategoriesSuspense,
  useCategorizationRulesSuspense,
  useDeleteCategorizationRule,
  useMoveCategorizationRule,
  useTagsSuspense,
} from "@/api/generated";
import type { CategorizationRuleResponse } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { CreateDialog } from "@/components/create-dialog/create-dialog";
import { ListSection } from "@/components/list-section/list-section";
import { EditModal, Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header/page-header";
import { Button } from "@/components/ui/button/button";
import { useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { silent } from "@/lib/mutations";
import { optimisticRemoval } from "@/lib/optimistic";
import { nameById } from "@/lib/options";
import { RuleForm } from "../rule-form/rule-form";
import { RuleRow } from "../rule-row/rule-row";
import { RunRulesDialog } from "../run-rules-dialog/run-rules-dialog";

export function RulesPage() {
  const { t } = useTranslation();
  const [runOpen, setRunOpen] = useState(false);
  const [editing, setEditing] = useState<CategorizationRuleResponse | null>(null);

  const rules = useCategorizationRulesSuspense();
  const accounts = useAccountsSuspense();
  const categories = useCategoriesSuspense();
  const tags = useTagsSuspense();

  const deleteMutation = useDeleteCategorizationRule({
    mutation: optimisticRemoval<CategorizationRuleResponse>(getCategorizationRulesQueryKey()),
  });

  const moveMutation = useMoveCategorizationRule(silent());

  const ruleList = useDeferredValue(rules.data) ?? [];
  const remove = useConfirmedDelete(
    deleteMutation,
    ruleList,
    (rule) => rule.name,
    "categorizationRule",
  );

  const accountNames = nameById(accounts.data);
  const categoryNames = nameById(categories.data);
  const tagNames = nameById(tags.data);

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("categorizationRules.title")}
        description={t("categorizationRules.subtitle")}
      >
        <Button variant="outline" onClick={() => setRunOpen(true)}>
          <Play />
          {t("categorizationRules.run")}
        </Button>
        <CreateDialog
          label={t("categorizationRules.add")}
          title={t("categorizationRules.addTitle")}
          className="sm:max-w-2xl"
        >
          {(close) => (
            <RuleForm
              accounts={accounts.data}
              categories={categories.data}
              tags={tags.data}
              onSaved={() => {
                close();
                toast.success(t("categorizationRules.created"));
              }}
              onCancel={close}
            />
          )}
        </CreateDialog>
      </PageHeader>

      <EditModal
        item={editing}
        title={t("categorizationRules.editTitle")}
        onClose={() => setEditing(null)}
      >
        {(rule) => (
          <RuleForm
            accounts={accounts.data}
            categories={categories.data}
            tags={tags.data}
            initial={rule}
            onSaved={() => {
              setEditing(null);
              toast.success(t("categorizationRules.updated"));
            }}
            onCancel={() => setEditing(null)}
          />
        )}
      </EditModal>

      <Modal
        open={runOpen}
        onOpenChange={setRunOpen}
        title={t("categorizationRules.runTitle")}
        className="sm:max-w-2xl"
      >
        <RunRulesDialog
          accounts={accounts.data}
          hasRules={ruleList.length > 0}
          onDone={() => setRunOpen(false)}
          onCancel={() => setRunOpen(false)}
        />
      </Modal>

      <ListSection
        title={t("categorizationRules.listTitle")}
        count={ruleList.length}
        description={t("categorizationRules.explainer")}
        emptyText={t("categorizationRules.empty")}
      >
        {ruleList.map((rule) => (
          <RuleRow
            key={rule.id}
            rule={rule}
            total={ruleList.length}
            accountNames={accountNames}
            categoryNames={categoryNames}
            tagNames={tagNames}
            movePending={moveMutation.isPending}
            deletePending={remove.pendingId === rule.id}
            deleteDisabled={remove.busy}
            onMove={(direction) => moveMutation.mutate({ id: rule.id, data: { direction } })}
            onEdit={() => setEditing(rule)}
            onDelete={() => remove.request(rule.id)}
          />
        ))}
      </ListSection>

      <ConfirmDeleteDialog {...remove.dialogProps} />
    </div>
  );
}
