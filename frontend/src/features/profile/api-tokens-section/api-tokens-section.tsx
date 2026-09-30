import { Copy, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import {
  useCreatePersonalApiToken,
  usePersonalApiTokensSuspense,
  useRevokePersonalApiToken,
} from "@/api/generated";
import type {
  CreatedPersonalApiTokenResponse,
  PersonalApiTokenResponse,
  TokenAccess,
} from "@/api/generated/model";
import { createPersonalApiTokenBodyNameMax } from "@/api/schemas/auth/auth.zod";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { CreateDialog } from "@/components/create-dialog/create-dialog";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { NamedRowsSkeleton } from "@/components/named-row/named-row";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Button } from "@/components/ui/button/button";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Input } from "@/components/ui/input/input";
import { Label } from "@/components/ui/label/label";
import { Rows } from "@/components/ui/rows/rows";
import { TitledSection } from "@/components/ui/section/section";
import { Tag } from "@/components/ui/tag/tag";
import { ActionRow } from "@/features/profile/action-row/action-row";
import { useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { useDate, useDateTime } from "@/hooks/use-formatters";
import { notify, silentMutation } from "@/lib/mutations";
import { requiredText, requiredValue } from "@/lib/validation";

const expiryOptions = ["30", "90", "365"] as const;
const writableExpiryOptions = ["30", "90"] as const;
const accessOptions = ["read", "readWrite"] as const satisfies readonly TokenAccess[];
const initialAccess: TokenAccess = "read";

function expiryChoices(access: TokenAccess) {
  return access === "readWrite" ? writableExpiryOptions : expiryOptions;
}

interface RowProps {
  token: PersonalApiTokenResponse;
  pending: boolean;
  disabled: boolean;
  onRevoke: () => void;
}

function TokenRow({ token, pending, disabled, onRevoke }: Readonly<RowProps>) {
  const { t } = useTranslation();
  const formatDate = useDate();
  const formatDateTime = useDateTime();

  const details = [
    ["created", formatDate.format(new Date(token.createdAt))],
    [token.isExpired ? "expired" : "expires", formatDate.format(new Date(token.expiresAt))],
    [
      "lastUsed",
      token.lastUsedAt ? formatDateTime(token.lastUsedAt) : t("profile.apiTokens.never"),
    ],
  ] as const;

  return (
    <ActionRow
      title={
        <>
          {token.name}
          <span className="font-mono text-xs font-normal text-muted-foreground">
            jxp_{token.prefix}…
          </span>
          <Tag>
            {t(
              token.access === "readWrite"
                ? "profile.apiTokens.access.badgeReadWrite"
                : "profile.apiTokens.access.badgeRead",
            )}
          </Tag>
          {token.isExpired ? <Tag>{t("profile.apiTokens.expiredTag")}</Tag> : null}
        </>
      }
      details={
        <dl className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
          {details.map(([key, value]) => (
            <div key={key} className="flex gap-1">
              <dt>{t(`profile.apiTokens.${key}`)}</dt>
              <dd className="tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      }
      icon={Trash2}
      actionLabel={t("profile.apiTokens.revoke")}
      itemLabel={token.name}
      pending={pending}
      disabled={disabled}
      onAction={onRevoke}
    />
  );
}

function TokenList() {
  const { t } = useTranslation();
  const tokens = usePersonalApiTokensSuspense().data;
  const revokeMutation = useRevokePersonalApiToken({
    mutation: notify(t("profile.apiTokens.revoked")),
  });
  const revoke = useConfirmedDelete(revokeMutation, tokens, (token) => token.name);

  if (tokens.length === 0) {
    return <EmptyText>{t("profile.apiTokens.empty")}</EmptyText>;
  }

  return (
    <>
      <Rows>
        {tokens.map((token) => (
          <TokenRow
            key={token.id}
            token={token}
            pending={revoke.pendingId === token.id}
            disabled={revoke.busy}
            onRevoke={() => revoke.request(token.id)}
          />
        ))}
      </Rows>
      <ConfirmDeleteDialog
        {...revoke.dialogProps}
        title={t("profile.apiTokens.revokeTitle")}
        description={t("profile.apiTokens.revokeDescription")}
        confirmLabel={t("profile.apiTokens.revoke")}
      />
    </>
  );
}

function CreatedToken({
  created,
  access,
  onDone,
}: Readonly<{
  created: CreatedPersonalApiTokenResponse;
  access: TokenAccess | undefined;
  onDone: () => void;
}>) {
  const { t } = useTranslation();

  function copy() {
    navigator.clipboard.writeText(created.token).then(
      () => toast.success(t("profile.apiTokens.copied")),
      () => toast.error(t("profile.apiTokens.copyFailed")),
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="api-token-secret">{t("profile.apiTokens.secret")}</Label>
        <div className="flex gap-2">
          <Input
            id="api-token-secret"
            readOnly
            value={created.token}
            className="font-mono"
            onFocus={(event) => event.currentTarget.select()}
          />
          <Button type="button" variant="outline" onClick={copy}>
            <Copy />
            {t("profile.apiTokens.copy")}
          </Button>
        </div>
      </div>
      {access === "readWrite" ? (
        <p className="text-sm text-muted-foreground">
          {t("profile.apiTokens.access.readWriteSummary")}
        </p>
      ) : null}
      <p className="text-sm font-medium">{t("profile.apiTokens.shownOnce")}</p>
      <div className="flex justify-end">
        <Button type="button" onClick={onDone}>
          {t("profile.apiTokens.done")}
        </Button>
      </div>
    </div>
  );
}

function CreateTokenForm({ onClose }: Readonly<{ onClose: () => void }>) {
  const { t } = useTranslation();
  const [created, setCreated] = useState<CreatedPersonalApiTokenResponse | null>(null);
  const create = useCreatePersonalApiToken({
    mutation: { ...silentMutation, onSuccess: setCreated },
  });

  const form = useServerForm({
    defaultValues: { name: "", access: initialAccess, expiresInDays: "90", password: "" },
    schema: z.object({
      name: requiredText(t, createPersonalApiTokenBodyNameMax),
      access: z.enum(accessOptions),
      expiresInDays: z.enum(expiryOptions),
      password: requiredValue(t),
    }),
    submit: (value) =>
      create.mutateAsync({
        data: {
          name: value.name.trim(),
          expiresInDays: Number(value.expiresInDays),
          password: value.password,
          access: value.access,
        },
      }),
  });

  if (created) {
    return (
      <CreatedToken created={created} access={create.variables?.data.access} onDone={onClose} />
    );
  }

  return (
    <form.AppForm>
      <form.FormShell className="space-y-4">
        <form.Field name="name">
          {(field) => (
            <field.TextField
              id="api-token-name"
              label={t("profile.apiTokens.name")}
              placeholder={t("profile.apiTokens.namePlaceholder")}
              autoFocus
            />
          )}
        </form.Field>
        <form.Field name="access">
          {(field) => (
            <field.SelectFieldControl
              id="api-token-access"
              kind="segments"
              label={t("profile.apiTokens.access.label")}
              options={accessOptions.map((access) => ({
                value: access,
                label: t(`profile.apiTokens.access.${access}`),
              }))}
              onValueChange={(value) => {
                if (value === "readWrite" && form.getFieldValue("expiresInDays") === "365") {
                  form.setFieldValue("expiresInDays", "90");
                }
              }}
            />
          )}
        </form.Field>
        <form.Subscribe selector={(state) => state.values.access}>
          {(access) => (
            <form.Field name="expiresInDays">
              {(field) => (
                <field.SelectFieldControl
                  id="api-token-expiry"
                  label={t("profile.apiTokens.expiry")}
                  options={expiryChoices(access).map((days) => ({
                    value: days,
                    label: t(`profile.apiTokens.expiryOptions.${days}`),
                  }))}
                />
              )}
            </form.Field>
          )}
        </form.Subscribe>
        <form.Field name="password">
          {(field) => (
            <field.TextField
              id="api-token-password"
              label={t("profile.currentPassword")}
              type="password"
              autoComplete="current-password"
            />
          )}
        </form.Field>
        <FormError error={create.error} />
        <form.FormActions
          pending={create.isPending}
          submitLabel={t("profile.apiTokens.create")}
          onCancel={onClose}
        />
      </form.FormShell>
    </form.AppForm>
  );
}

export function ApiTokensSection() {
  const { t } = useTranslation();

  return (
    <TitledSection
      title={t("profile.apiTokens.title")}
      description={t("profile.apiTokens.description")}
      bodyGap="md"
    >
      <div className="space-y-4">
        <QueryBoundary fallback={<NamedRowsSkeleton rows={2} />}>
          <TokenList />
        </QueryBoundary>
        <CreateDialog
          label={t("profile.apiTokens.create")}
          title={t("profile.apiTokens.createTitle")}
          secondary
        >
          {(close) => <CreateTokenForm onClose={close} />}
        </CreateDialog>
      </div>
    </TitledSection>
  );
}
