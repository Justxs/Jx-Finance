import { Play } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getCategorizationRulesQueryKey,
  useAccountsSuspense,
  useCategoriesSuspense,
  useCategorizationRulesSuspense,
  useDeleteCategorizationRule,
  useMoveCategorizationRule,
  useSuggestedRulesSuspense,
  useTagsSuspense,
} from "@/api/generated";
import type { CategorizationRuleResponse } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { CreateDialog } from "@/components/create-dialog/create-dialog";
import { ListSection } from "@/components/list-section/list-section";
import { EditModal, Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header/page-header";
import { Button } from "@/components/ui/button/button";
import { RuleForm } from "@/features/categorization-rules/rule-form/rule-form";
import { movedRules } from "@/features/categorization-rules/rule-order";
import { RuleRow } from "@/features/categorization-rules/rule-row/rule-row";
import { RunRulesDialog } from "@/features/categorization-rules/run-rules-dialog/run-rules-dialog";
import { SuggestedRules } from "@/features/categorization-rules/suggested-rules/suggested-rules";
import { useEditableList } from "@/hooks/use-editable-list";
import { optimisticRemoval, optimisticUpdate } from "@/lib/optimistic";
import { nameById } from "@/lib/options";
import { type MoveDirection, adjacentIndex } from "@/lib/reorder";

interface MoveFocus {
  id: string;
  position: number;
  direction: MoveDirection;
}

export function RulesPage() {
  const { t } = useTranslation();
  const [runOpen, setRunOpen] = useState(false);
  const [moveFocus, setMoveFocus] = useState<MoveFocus | null>(null);
  const [moveAnnouncement, setMoveAnnouncement] = useState("");

  const accounts = useAccountsSuspense();
  const categories = useCategoriesSuspense();
  const tags = useTagsSuspense();
  const suggestions = useSuggestedRulesSuspense();

  const rules = useEditableList(
    useCategorizationRulesSuspense().data,
    useDeleteCategorizationRule({
      mutation: optimisticRemoval<CategorizationRuleResponse>(getCategorizationRulesQueryKey()),
    }),
    (rule) => rule.name,
    "categorizationRule",
  );

  const moveMutation = useMoveCategorizationRule({
    mutation: optimisticUpdate({
      queryKey: getCategorizationRulesQueryKey(),
      apply: movedRules,
    }),
  });

  const ruleList = rules.list;

  function move(rule: CategorizationRuleResponse, direction: MoveDirection) {
    const position = adjacentIndex(rule.position, direction);
    const atEdge = direction === "up" ? position === 0 : position === ruleList.length - 1;
    const opposite = direction === "up" ? "down" : "up";
    setMoveFocus({ id: rule.id, position, direction: atEdge ? opposite : direction });
    setMoveAnnouncement(
      t("categorizationRules.moved", {
        name: rule.name,
        position: position + 1,
        total: ruleList.length,
      }),
    );
    moveMutation.mutate({ id: rule.id, data: { direction } });
  }

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
              onClose={close}
            />
          )}
        </CreateDialog>
      </PageHeader>

      <EditModal
        {...rules.editProps}
        title={(rule) => `${t("categorizationRules.editTitle")}: ${rule.name}`}
      >
        {(rule, close) => (
          <RuleForm
            accounts={accounts.data}
            categories={categories.data}
            tags={tags.data}
            initial={rule}
            onClose={close}
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
          onClose={() => setRunOpen(false)}
        />
      </Modal>

      <SuggestedRules
        suggestions={suggestions.data}
        accounts={accounts.data}
        categories={categories.data}
        tags={tags.data}
      />

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
            focusMove={
              moveFocus?.id === rule.id && moveFocus.position === rule.position
                ? moveFocus.direction
                : undefined
            }
            onMove={(direction) => move(rule, direction)}
            {...rules.rowProps(rule)}
          />
        ))}
      </ListSection>
      <p role="status" className="sr-only">
        {moveAnnouncement}
      </p>

      <ConfirmDeleteDialog {...rules.dialogProps} />
    </div>
  );
}
