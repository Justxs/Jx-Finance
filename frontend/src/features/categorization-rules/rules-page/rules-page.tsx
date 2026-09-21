import { Play, Plus } from "lucide-react";
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
import { EditModal, Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header/page-header";
import { Button } from "@/components/ui/button/button";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import { Section, SectionTitle } from "@/components/ui/section/section";
import { useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { silent } from "@/lib/mutations";
import { optimisticRemoval } from "@/lib/optimistic";
import { nameById } from "@/lib/options";
import { RuleForm } from "../rule-form/rule-form";
import { RuleRow } from "../rule-row/rule-row";
import { RunRulesDialog } from "../run-rules-dialog/run-rules-dialog";

export function RulesPage() {
  const { t } = useTranslation();
  const [addOpen, setAddOpen] = useState(false);
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
        <Button onClick={() => setAddOpen(true)}>
          <Plus />
          {t("categorizationRules.add")}
        </Button>
      </PageHeader>

      <Modal
        open={addOpen}
        onOpenChange={setAddOpen}
        title={t("categorizationRules.addTitle")}
        className="sm:max-w-2xl"
      >
        <RuleForm
          accounts={accounts.data}
          categories={categories.data}
          tags={tags.data}
          onSaved={() => {
            setAddOpen(false);
            toast.success(t("categorizationRules.created"));
          }}
          onCancel={() => setAddOpen(false)}
        />
      </Modal>

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

      <Section>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <SectionTitle>{t("categorizationRules.listTitle")}</SectionTitle>
          <span className="text-sm text-muted-foreground tabular-nums">{ruleList.length}</span>
        </div>
        <p className="mb-3 max-w-prose text-sm text-muted-foreground">
          {t("categorizationRules.explainer")}
        </p>
        {ruleList.length === 0 ? (
          <EmptyText>{t("categorizationRules.empty")}</EmptyText>
        ) : (
          <Rows>
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
          </Rows>
        )}
      </Section>

      <ConfirmDeleteDialog {...remove.dialogProps} />
    </div>
  );
}
