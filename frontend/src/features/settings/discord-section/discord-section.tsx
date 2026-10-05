import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import {
  useDiscordSettingsSuspense,
  useSendTestDiscord,
  useUpdateDiscordSettings,
} from "@/api/generated";
import type { DiscordSettingsResponse } from "@/api/generated/model";
import { useServerForm } from "@/components/form";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { ChannelActions } from "@/features/settings/channel-actions/channel-actions";
import { DeliveryStatus } from "@/features/settings/delivery-status/delivery-status";
import { ChannelFormSkeleton } from "@/features/settings/settings-page/settings-page-pending";
import { silentMutation } from "@/lib/mutations";

const webhookPattern =
  /^https:\/\/(?:discord\.com|discordapp\.com|ptb\.discord\.com|canary\.discord\.com)\/api\/webhooks\/\d{1,20}\/[\w-]{1,100}$/iu;

function DiscordForm({ settings }: Readonly<{ settings: DiscordSettingsResponse }>) {
  const { t } = useTranslation();
  const saveMutation = useUpdateDiscordSettings({
    mutation: { ...silentMutation, onSuccess: () => toast.success(t("settings.discord.saved")) },
  });
  const testMutation = useSendTestDiscord({
    mutation: { ...silentMutation, onSuccess: () => toast.success(t("settings.discord.testSent")) },
  });

  const schema = z
    .object({
      enabled: z.boolean(),
      webhookUrl: z
        .string()
        .refine((value) => value.trim() === "" || webhookPattern.test(value.trim()), {
          message: t("serverErrors.discord.invalidWebhook"),
        }),
    })
    .refine((value) => !value.enabled || settings.hasWebhook || value.webhookUrl.trim() !== "", {
      message: t("validation.required"),
      path: ["webhookUrl"],
    });

  const form = useServerForm({
    defaultValues: { enabled: settings.enabled, webhookUrl: "" },
    schema,
    submit: async (value, formApi) => {
      testMutation.reset();
      await saveMutation.mutateAsync({
        data: { enabled: value.enabled, webhookUrl: value.webhookUrl.trim() || null },
      });
      formApi.reset({ ...value, webhookUrl: "" });
    },
  });

  const problem =
    (settings.unreadable && t("settings.discord.unreadable")) ||
    (settings.disabledByDiscord && t("settings.discord.gone"));

  return (
    <form.AppForm>
      <form.FormShell className="mt-4 space-y-5">
        {problem ? (
          <p role="alert" className="max-w-prose text-sm font-medium text-expense">
            {problem}
          </p>
        ) : null}

        <form.Field name="enabled">
          {(field) => (
            <field.CheckboxField
              id="discord-enabled"
              className="max-w-prose"
              label={t("settings.discord.enabled")}
              hint={t("settings.discord.enabledHint")}
            />
          )}
        </form.Field>

        <form.Field name="webhookUrl">
          {(field) => (
            <field.TextField
              id="discord-webhook-url"
              type="password"
              autoComplete="off"
              spellCheck={false}
              className="max-w-md"
              label={t("settings.discord.webhookUrl")}
              hint={t("settings.discord.webhookUrlHint")}
              placeholder={
                settings.hasWebhook ? t("settings.discord.webhookPlaceholder") : undefined
              }
            />
          )}
        </form.Field>

        <DeliveryStatus
          configured={settings.hasWebhook}
          lastDeliveredAt={settings.lastDeliveredAt}
          lastError={problem ? null : settings.lastError}
        />

        <ChannelActions
          error={testMutation.error ?? saveMutation.error}
          testLabel={t("settings.discord.test")}
          testHint={t("settings.discord.testHint")}
          testPending={testMutation.isPending}
          canTest={settings.hasWebhook}
          onTest={() => {
            saveMutation.reset();
            testMutation.mutate();
          }}
        >
          <form.SubmitButton pending={saveMutation.isPending} className="ml-auto">
            {t("actions.save")}
          </form.SubmitButton>
        </ChannelActions>
      </form.FormShell>
    </form.AppForm>
  );
}

function DiscordSettings() {
  return <DiscordForm settings={useDiscordSettingsSuspense().data} />;
}

export function DiscordSection() {
  const { t } = useTranslation();

  return (
    <>
      <p className="max-w-prose text-sm text-muted-foreground">
        {t("settings.discord.description")}
      </p>
      <QueryBoundary fallback={<ChannelFormSkeleton />} errorSubject={t("settings.discord.title")}>
        <DiscordSettings />
      </QueryBoundary>
    </>
  );
}
