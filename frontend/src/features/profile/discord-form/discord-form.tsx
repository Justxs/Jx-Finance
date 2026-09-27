import { Info, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import { useDeleteMyDiscord, useTestMyDiscord, useUpdateMyDiscord } from "@/api/generated";
import { NotificationType } from "@/api/generated/model";
import type { DiscordWebhookResponse } from "@/api/generated/model";
import { CheckboxList } from "@/components/checkbox-list/checkbox-list";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { Button } from "@/components/ui/button/button";
import { Hint } from "@/components/ui/field-error";
import { Section, SectionTitle } from "@/components/ui/section/section";
import { useDateTime } from "@/hooks/use-formatters";
import { useDiscordEnabled } from "@/hooks/use-settings";
import { silent } from "@/lib/mutations";

const webhookPattern =
  /^https:\/\/(?:discord\.com|discordapp\.com|ptb\.discord\.com|canary\.discord\.com)\/api\/webhooks\/\d{1,20}\/[\w-]{1,100}$/iu;

const kinds = Object.values(NotificationType);

interface FormValues {
  webhookUrl: string;
  isEnabled: boolean;
  types: NotificationType[];
}

export function DiscordForm({ settings }: Readonly<{ settings: DiscordWebhookResponse }>) {
  const { t } = useTranslation();
  const formatDateTime = useDateTime();
  const paused = !useDiscordEnabled();
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const saveMutation = useUpdateMyDiscord(
    silent({ onSuccess: () => toast.success(t("profile.discord.saved")) }),
  );
  const testMutation = useTestMyDiscord(
    silent({ onSuccess: () => toast.success(t("profile.discord.testSent")) }),
  );
  const removeMutation = useDeleteMyDiscord(
    silent({ onSuccess: () => toast.success(t("profile.discord.removed")) }),
  );

  const schema = z.object({
    webhookUrl: z
      .string()
      .refine((value) => value.trim() === "" || webhookPattern.test(value.trim()), {
        message: t("serverErrors.discord.invalidWebhook"),
      })
      .refine((value) => settings.hasWebhook || value.trim() !== "", {
        message: t("validation.required"),
      }),
    isEnabled: z.boolean(),
    types: z.array(z.enum(NotificationType)),
  });

  const defaultValues: FormValues = {
    webhookUrl: "",
    isEnabled: settings.isEnabled,
    types: [...settings.types],
  };

  const form = useServerForm({
    defaultValues,
    schema,
    submit: (value, formApi) =>
      saveMutation.mutateAsync(
        {
          data: {
            webhookUrl: value.webhookUrl.trim() || null,
            isEnabled: value.isEnabled,
            types: value.types,
          },
        },
        { onSuccess: () => formApi.reset({ ...value, webhookUrl: "" }) },
      ),
  });

  const problem =
    (settings.unreadable && t("profile.discord.unreadable")) ||
    (settings.disabledByDiscord && t("profile.discord.gone"));

  const delivery =
    settings.hasWebhook &&
    (settings.lastDeliveredAt
      ? t("profile.discord.lastDelivered", { date: formatDateTime(settings.lastDeliveredAt) })
      : t("profile.discord.neverDelivered"));

  return (
    <form.AppForm>
      <form.FormShell as={Section} className="space-y-5">
        <div className="max-w-prose space-y-1.5">
          <SectionTitle>{t("profile.discord.title")}</SectionTitle>
          <p className="text-sm text-muted-foreground">{t("profile.discord.description")}</p>
        </div>

        {paused ? (
          <p role="status" className="flex max-w-prose gap-2 text-sm">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            {t("profile.discord.installationOff")}
          </p>
        ) : null}

        {problem ? (
          <p role="alert" className="max-w-prose text-sm font-medium text-expense">
            {problem}
          </p>
        ) : null}

        <div className="max-w-md space-y-4">
          <form.Field name="webhookUrl">
            {(field) => (
              <field.TextField
                id="discord-webhook-url"
                type="password"
                autoComplete="off"
                spellCheck={false}
                disabled={paused}
                label={t("profile.discord.webhookUrl")}
                hint={t("profile.discord.webhookUrlHint")}
                placeholder={
                  settings.hasWebhook ? t("profile.discord.webhookPlaceholder") : undefined
                }
              />
            )}
          </form.Field>

          <form.Field name="isEnabled">
            {(field) => (
              <field.CheckboxField
                id="discord-is-enabled"
                disabled={paused}
                label={t("profile.discord.enabled")}
              />
            )}
          </form.Field>

          <form.Field name="types">
            {(field) => (
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">{t("profile.discord.kinds")}</legend>
                <CheckboxList
                  aria-label={t("profile.discord.kinds")}
                  aria-describedby="discord-kinds-hint"
                  disabled={paused}
                  items={kinds.map((kind) => ({
                    id: kind,
                    name: t(`notifications.kinds.${kind}`),
                  }))}
                  value={field.value}
                  onChange={(next) =>
                    field.handleChange(kinds.filter((kind) => next.includes(kind)))
                  }
                />
                <Hint id="discord-kinds-hint">{t("profile.discord.kindsHint")}</Hint>
              </fieldset>
            )}
          </form.Field>
        </div>

        {delivery || settings.lastError ? (
          <div className="max-w-prose space-y-0.5 text-sm text-muted-foreground">
            {delivery ? <p>{delivery}</p> : null}
            {settings.lastError && !problem ? (
              <p className="wrap-break-word">
                {t("profile.discord.lastError", { error: settings.lastError })}
              </p>
            ) : null}
          </div>
        ) : null}

        <FormError error={saveMutation.error ?? testMutation.error ?? removeMutation.error} />

        <div className="flex flex-wrap items-center gap-2 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            pending={testMutation.isPending}
            disabled={paused || !settings.hasWebhook}
            onClick={() => {
              saveMutation.reset();
              removeMutation.reset();
              testMutation.reset();
              testMutation.mutate();
            }}
          >
            <Send />
            {t("profile.discord.test")}
          </Button>
          {settings.hasWebhook ? (
            <Button
              type="button"
              variant="ghost-destructive"
              pending={removeMutation.isPending}
              onClick={() => setConfirmingRemove(true)}
            >
              <Trash2 />
              {t("profile.discord.remove")}
            </Button>
          ) : null}
          <form.SubmitButton pending={saveMutation.isPending} disabled={paused} className="ml-auto">
            {t("actions.save")}
          </form.SubmitButton>
        </div>
      </form.FormShell>
      <ConfirmDeleteDialog
        target={confirmingRemove ? true : null}
        title={t("profile.discord.removeTitle")}
        description={t("profile.discord.removeDescription")}
        confirmLabel={t("profile.discord.remove")}
        onCancel={() => setConfirmingRemove(false)}
        onConfirm={() => {
          setConfirmingRemove(false);
          testMutation.reset();
          removeMutation.mutate();
        }}
      />
    </form.AppForm>
  );
}
