import { useQuery } from "@tanstack/react-query";
import { CircleMinus, Group } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
  getTransactionGroupsSuspenseQueryOptions,
  useAddToTransactionGroup,
  useCreateTransactionGroup,
  useRemoveFromTransactionGroup,
  useHouseholdsSuspense,
  useRenameTransactionGroup,
} from "@/api/generated";
import type {
  TransactionGroupResponse,
  TransactionGroupSummary,
  TransactionResponse,
} from "@/api/generated/model";
import { createTransactionGroupBodyNameMax } from "@/api/schemas/transaction-groups/transaction-groups.zod";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { EditModal } from "@/components/modal";
import type { RowAction } from "@/components/row-actions/row-actions";
import { SharingFields } from "@/components/sharing-fields/sharing-fields";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { useIsoDate } from "@/hooks/use-formatters";
import { isOptimistic } from "@/lib/transaction-row";
import { metaLine } from "@/lib/utils";
import { refineSharing, sharingPayload, sharingShape } from "@/lib/validation";
import { useSharingDefaults } from "@/stores/active-household-store";

export type GroupTarget =
  | { kind: "selection"; transactionIds: string[] }
  | { kind: "row"; transactionId: string }
  | {
      kind: "rename";
      group: Pick<TransactionGroupSummary, "id" | "name" | "scope" | "householdId">;
    };

interface FormProps {
  target: GroupTarget;
  onClose: () => void;
  onGrouped?: () => void;
}

function transactionIdsOf(target: GroupTarget) {
  if (target.kind === "selection") {
    return target.transactionIds;
  }
  return target.kind === "row" ? [target.transactionId] : [];
}

export function GroupForm({ target, onClose, onGrouped }: Readonly<FormProps>) {
  const { t } = useTranslation();
  const formatDate = useIsoDate();
  const fromRow = target.kind === "row";
  const sharing = useSharingDefaults(
    useHouseholdsSuspense().data,
    target.kind === "rename" ? target.group : undefined,
  );
  const groups = useQuery({ ...getTransactionGroupsSuspenseQueryOptions(), enabled: fromRow }).data;
  const existing: TransactionGroupResponse[] = fromRow ? (groups ?? []) : [];
  const grouped = { meta: { silent: true, success: t("transactions.groups.grouped") } } as const;
  function done() {
    onGrouped?.();
    onClose();
  }
  const create = useCreateTransactionGroup({ mutation: { ...grouped, onSuccess: done } });
  const add = useAddToTransactionGroup({ mutation: { ...grouped, onSuccess: done } });
  const rename = useRenameTransactionGroup({
    mutation: { meta: { silent: true }, onSuccess: onClose },
  });
  const pending = create.isPending || add.isPending || rename.isPending;
  const error = create.error ?? add.error ?? rename.error;
  const max = createTransactionGroupBodyNameMax;

  const form = useServerForm({
    defaultValues: {
      choice: "new",
      name: target.kind === "rename" ? target.group.name : "",
      groupId: "",
      ...sharing,
    },
    schema: refineSharing(
      z
        .object({
          choice: z.enum(["new", "existing"]),
          name: z.string(),
          groupId: z.string(),
          ...sharingShape(),
        })
        .refine((value) => value.choice === "existing" || value.name.trim().length > 0, {
          path: ["name"],
          message: t("validation.required"),
        })
        .refine((value) => value.name.trim().length <= max, {
          path: ["name"],
          message: t("validation.maxLength", { max }),
        })
        .refine((value) => value.choice === "new" || value.groupId !== "", {
          path: ["groupId"],
          message: t("validation.required"),
        }),
      t,
    ),
    submit: (value) => {
      const name = value.name.trim();
      if (target.kind === "rename") {
        return rename.mutateAsync({
          id: target.group.id,
          data: { name, ...sharingPayload(value) },
        });
      }
      const transactionIds = transactionIdsOf(target);
      return value.choice === "existing"
        ? add.mutateAsync({ id: value.groupId, data: { transactionIds } })
        : create.mutateAsync({ data: { name, transactionIds, ...sharingPayload(value) } });
    },
  });

  const groupOptions = existing.map((group) => ({
    value: group.id,
    label: metaLine(
      group.name,
      `${formatDate(group.firstDate)} – ${formatDate(group.lastDate)}`,
      t("transactions.groups.rows", { count: group.memberCount }),
    ),
  }));

  return (
    <form.AppForm>
      <form.FormShell className="space-y-4">
        {fromRow && existing.length > 0 ? (
          <form.Field name="choice">
            {(field) => (
              <field.SelectFieldControl
                id="group-choice"
                kind="segments"
                aria-label={t("transactions.groups.dialogTitle")}
                options={[
                  { value: "new", label: t("transactions.groups.newGroup") },
                  { value: "existing", label: t("transactions.groups.existingGroup") },
                ]}
              />
            )}
          </form.Field>
        ) : null}
        {fromRow && groups !== undefined && existing.length === 0 ? (
          <EmptyText size="sm">{t("transactions.groups.noGroups")}</EmptyText>
        ) : null}

        <form.Subscribe selector={(state) => state.values.choice}>
          {(choice) =>
            choice === "existing" ? (
              <form.Field name="groupId">
                {(field) => (
                  <field.SelectFieldControl
                    id="group-existing"
                    kind="search"
                    label={t("transactions.groups.existingGroup")}
                    placeholder={t("transactions.groups.existingGroup")}
                    options={groupOptions}
                  />
                )}
              </form.Field>
            ) : (
              <>
                <form.Field name="name">
                  {(field) => (
                    <field.TextField
                      id="group-name"
                      label={t("transactions.groups.name")}
                      placeholder={t("transactions.groups.namePlaceholder")}
                      autoFocus
                    />
                  )}
                </form.Field>
                <SharingFields
                  form={form}
                  fields={{ scope: "scope", householdId: "householdId" }}
                  idPrefix="group"
                />
              </>
            )
          }
        </form.Subscribe>

        <FormError error={error} />

        <form.FormActions
          pending={pending}
          submitLabel={
            target.kind === "rename" ? t("actions.save") : t("transactions.groups.group")
          }
          onCancel={onClose}
        />
      </form.FormShell>
    </form.AppForm>
  );
}

interface DialogTarget {
  id: string;
  target: GroupTarget;
}

function dialogIdOf(target: GroupTarget) {
  if (target.kind === "rename") {
    return target.group.id;
  }
  return target.kind === "row" ? target.transactionId : target.transactionIds.join(",");
}

export function useGroupDialog(onGrouped?: () => void) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<DialogTarget | null>(null);

  const dialog = (
    <EditModal
      item={open}
      onClose={() => setOpen(null)}
      title={(item) =>
        item.target.kind === "rename"
          ? `${t("transactions.groups.rename")}: ${item.target.group.name}`
          : t("transactions.groups.dialogTitle")
      }
    >
      {(item, close) => <GroupForm target={item.target} onClose={close} onGrouped={onGrouped} />}
    </EditModal>
  );

  return {
    open: (target: GroupTarget) => setOpen({ id: dialogIdOf(target), target }),
    dialog,
  };
}

export function useGroupRowActions() {
  const { t } = useTranslation();
  const groupDialog = useGroupDialog();
  const remove = useRemoveFromTransactionGroup();

  function actionFor(transaction: TransactionResponse): RowAction {
    const groupId = transaction.groupId;
    if (groupId) {
      return {
        icon: CircleMinus,
        label: t("transactions.groups.removeFromGroup"),
        pending: remove.isPending && remove.variables.transactionId === transaction.id,
        onSelect: () => remove.mutate({ id: groupId, transactionId: transaction.id }),
      };
    }
    return {
      icon: Group,
      label: t("transactions.groups.addToGroup"),
      disabled: isOptimistic(transaction),
      onSelect: () => groupDialog.open({ kind: "row", transactionId: transaction.id }),
    };
  }

  return { actionFor, dialog: groupDialog.dialog };
}
