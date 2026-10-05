import { useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
  useAddPasskey,
  useBeginPasskeyRegistration,
  usePasskeysSuspense,
  useRemovePasskey,
  useRenamePasskey,
} from "@/api/generated";
import type { PasskeyResponse } from "@/api/generated/model";
import { renamePasskeyBodyNameMax } from "@/api/schemas/auth/auth.zod";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { EditModal } from "@/components/modal";
import { NamedRowsSkeleton } from "@/components/named-row/named-row";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { RowActions } from "@/components/row-actions/row-actions";
import { RowTransition } from "@/components/row-transition/row-transition";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import { TitledSection } from "@/components/ui/section/section";
import { Tag } from "@/components/ui/tag/tag";
import { TextLink } from "@/components/ui/text-link/text-link";
import { PasswordPrompt } from "@/features/profile/password-prompt/password-prompt";
import { useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { useDate } from "@/hooks/use-formatters";
import { usePasskeysAvailable } from "@/hooks/use-settings";
import type { TranslationKey } from "@/lib/i18n";
import { notify, silentMutation } from "@/lib/mutations";
import { type PasskeyFailure, createPasskey, passkeysSupported } from "@/lib/passkeys";
import { browserLabel } from "@/lib/user-agent";
import { requiredText } from "@/lib/validation";

const failureText: Record<Exclude<PasskeyFailure, "cancelled">, TranslationKey> = {
  alreadyRegistered: "profile.passkeys.alreadyRegistered",
  failed: "profile.passkeys.failed",
};

interface RowProps {
  passkey: PasskeyResponse;
  deleting: boolean;
  disabled: boolean;
  onRename: () => void;
  onRemove: () => void;
}

function PasskeyRow({ passkey, deleting, disabled, onRename, onRemove }: Readonly<RowProps>) {
  const { t } = useTranslation();
  const formatDate = useDate();

  return (
    <RowTransition>
      <li className="flex items-center justify-between gap-2 py-2">
        <div className="min-w-0 space-y-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium wrap-break-word">
            {passkey.name}
            <Tag>
              {passkey.isSynced ? t("profile.passkeys.synced") : t("profile.passkeys.deviceBound")}
            </Tag>
          </p>
          <p className="flex gap-1 text-xs text-muted-foreground">
            <span>{t("profile.passkeys.addedOn")}</span>
            <span className="tabular-nums">{formatDate.format(new Date(passkey.createdAt))}</span>
          </p>
        </div>
        <RowActions
          label={passkey.name}
          onEdit={onRename}
          editDisabled={disabled}
          onDelete={onRemove}
          deletePending={deleting}
          deleteDisabled={disabled}
        />
      </li>
    </RowTransition>
  );
}

function RenameForm({
  passkey,
  onClose,
}: Readonly<{ passkey: PasskeyResponse; onClose: () => void }>) {
  const { t } = useTranslation();
  const rename = useRenamePasskey({ mutation: { ...silentMutation, onSuccess: onClose } });

  const form = useServerForm({
    defaultValues: { name: passkey.name },
    schema: z.object({ name: requiredText(t, renamePasskeyBodyNameMax) }),
    submit: (value) => rename.mutateAsync({ id: passkey.id, data: { name: value.name.trim() } }),
  });

  return (
    <form.AppForm>
      <form.FormShell className="space-y-4">
        <form.Field name="name">
          {(field) => (
            <field.TextField id="passkey-name" label={t("profile.passkeys.name")} autoFocus />
          )}
        </form.Field>
        <FormError error={rename.error} />
        <form.FormActions
          pending={rename.isPending}
          submitLabel={t("actions.save")}
          onCancel={onClose}
        />
      </form.FormShell>
    </form.AppForm>
  );
}

function PasskeyList() {
  const { t } = useTranslation();
  const passkeys = usePasskeysSuspense().data;
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [removedOne, setRemovedOne] = useState(false);

  const removeMutation = useRemovePasskey({
    mutation: { ...notify(t("profile.passkeys.removed")), onSuccess: () => setRemovedOne(true) },
  });
  const remove = useConfirmedDelete(removeMutation, passkeys, (passkey) => passkey.name);

  return (
    <>
      {passkeys.length === 0 ? (
        <EmptyText>{t("profile.passkeys.empty")}</EmptyText>
      ) : (
        <Rows className="max-w-2xl">
          {passkeys.map((passkey) => (
            <PasskeyRow
              key={passkey.id}
              passkey={passkey}
              deleting={remove.pendingId === passkey.id}
              disabled={remove.busy}
              onRename={() => setRenamingId(passkey.id)}
              onRemove={() => remove.request(passkey.id)}
            />
          ))}
        </Rows>
      )}
      {removedOne ? (
        <p className="mt-3 max-w-prose text-sm text-muted-foreground">
          {t("profile.passkeys.signOutHint")}{" "}
          <TextLink to="/profile" search={{ section: "sessions" }}>
            {t("profile.passkeys.signOutLink")}
          </TextLink>
        </p>
      ) : null}
      <EditModal
        item={passkeys.find((passkey) => passkey.id === renamingId) ?? null}
        title={(passkey) => `${t("profile.passkeys.renameTitle")}: ${passkey.name}`}
        onClose={() => setRenamingId(null)}
      >
        {(passkey, close) => <RenameForm passkey={passkey} onClose={close} />}
      </EditModal>
      <ConfirmDeleteDialog
        {...remove.dialogProps}
        title={t("profile.passkeys.removeTitle")}
        description={t("profile.passkeys.removeDescription")}
        confirmLabel={t("profile.passkeys.remove")}
      />
    </>
  );
}

function AddPasskey() {
  const { t } = useTranslation();
  const [failure, setFailure] = useState<PasskeyFailure | null>(null);
  const begin = useBeginPasskeyRegistration({ mutation: silentMutation });
  const add = useAddPasskey({
    mutation: { meta: { silent: true, success: t("profile.passkeys.added") } },
  });

  async function register(password: string) {
    setFailure(null);
    add.reset();
    const { optionsJson } = await begin.mutateAsync({ data: { password } });
    const created = await createPasskey(optionsJson);
    if (!created.ok) {
      setFailure(created.reason);
      return;
    }
    await add.mutateAsync({
      data: {
        credentialJson: created.credentialJson,
        name: browserLabel(t, navigator.userAgent) ?? t("profile.passkeys.defaultName"),
      },
    });
  }

  return (
    <PasswordPrompt
      id="passkey-password"
      submitLabel={t("profile.passkeys.add")}
      variant="outline"
      pending={begin.isPending || add.isPending}
      error={begin.error ?? add.error}
      message={failure && failure !== "cancelled" ? t(failureText[failure]) : undefined}
      onSubmit={register}
    />
  );
}

export function PasskeysSection() {
  const { t } = useTranslation();
  const available = usePasskeysAvailable();
  const supported = passkeysSupported();

  return (
    <TitledSection
      title={t("profile.passkeys.title")}
      description={t("profile.passkeys.description")}
      bodyGap="md"
    >
      <div className="space-y-4">
        <QueryBoundary fallback={<NamedRowsSkeleton rows={2} />}>
          <PasskeyList />
        </QueryBoundary>
        {available && supported ? (
          <AddPasskey />
        ) : (
          <p className="max-w-prose text-sm text-muted-foreground">
            {available ? t("profile.passkeys.unsupported") : t("profile.passkeys.unavailable")}
          </p>
        )}
      </div>
    </TitledSection>
  );
}
