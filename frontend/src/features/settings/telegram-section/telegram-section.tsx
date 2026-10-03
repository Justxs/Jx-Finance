import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import {
  useSendTestTelegram,
  useTelegramSettingsSuspense,
  useUpdateTelegramSettings,
} from "@/api/generated";
import type { TelegramSettingsResponse } from "@/api/generated/model";
import { useServerForm } from "@/components/form";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { ChannelActions } from "@/features/settings/channel-actions/channel-actions";
import { DeliveryStatus } from "@/features/settings/delivery-status/delivery-status";
import { ChannelFormSkeleton } from "@/features/settings/settings-page/settings-page-pending";
import { silentMutation } from "@/lib/mutations";

const tokenPattern = /^\d{1,20}:[\w-]{30,100}$/u;
const chatIdPattern = /^-?[1-9]\d{0,15}$/u;

function isChatId(value: string) {
  return chatIdPattern.test(value) && Number.isSafeInteger(Number(value));
}

function TelegramForm({ settings }: Readonly<{ settings: TelegramSettingsResponse }>) {
  const { t } = useTranslation();
  const saveMutation = useUpdateTelegramSettings({
    mutation: { ...silentMutation, onSuccess: () => toast.success(t("settings.telegram.saved")) },
  });
  const testMutation = useSendTestTelegram({
    mutation: {
      ...silentMutation,
      onSuccess: () => toast.success(t("settings.telegram.testSent")),
    },
  });
  const configured = settings.hasToken && settings.chatId !== null;

  const schema = z
    .object({
      enabled: z.boolean(),
      botToken: z
        .string()
        .refine((value) => value.trim() === "" || tokenPattern.test(value.trim()), {
          message: t("serverErrors.telegram.invalidToken"),
        }),
      chatId: z.string().refine((value) => value.trim() === "" || isChatId(value.trim()), {
        message: t("serverErrors.telegram.invalidChat"),
      }),
    })
    .refine((value) => !value.enabled || settings.hasToken || value.botToken.trim() !== "", {
      message: t("validation.required"),
      path: ["botToken"],
    })
    .refine((value) => !value.enabled || value.chatId.trim() !== "", {
      message: t("validation.required"),
      path: ["chatId"],
    });

  const form = useServerForm({
    defaultValues: {
      enabled: settings.enabled,
      botToken: "",
      chatId: settings.chatId === null ? "" : String(settings.chatId),
    },
    schema,
    submit: async (value, formApi) => {
      testMutation.reset();
      const chatId = value.chatId.trim();
      await saveMutation.mutateAsync({
        data: {
          enabled: value.enabled,
          botToken: value.botToken.trim() || null,
          chatId: chatId === "" ? null : Number(chatId),
        },
      });
      formApi.reset({ ...value, botToken: "", chatId });
    },
  });

  const problem =
    (settings.unreadable && t("settings.telegram.unreadable")) ||
    (settings.disabledByTelegram && t("settings.telegram.removed"));

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
              id="telegram-enabled"
              className="max-w-prose"
              label={t("settings.telegram.enabled")}
              hint={t("settings.telegram.enabledHint")}
            />
          )}
        </form.Field>

        <form.Field name="botToken">
          {(field) => (
            <field.TextField
              id="telegram-bot-token"
              type="password"
              autoComplete="off"
              spellCheck={false}
              className="max-w-md"
              label={t("settings.telegram.botToken")}
              hint={t("settings.telegram.botTokenHint")}
              placeholder={settings.hasToken ? t("settings.telegram.tokenPlaceholder") : undefined}
            />
          )}
        </form.Field>

        <form.Field name="chatId">
          {(field) => (
            <field.TextField
              id="telegram-chat-id"
              inputMode="numeric"
              autoComplete="off"
              spellCheck={false}
              className="max-w-md"
              label={t("settings.telegram.chatId")}
              hint={t("settings.telegram.chatIdHint")}
            />
          )}
        </form.Field>

        <DeliveryStatus
          configured={configured}
          lastDeliveredAt={settings.lastDeliveredAt}
          lastError={problem ? null : settings.lastError}
        />

        <ChannelActions
          error={testMutation.error ?? saveMutation.error}
          testLabel={t("settings.telegram.test")}
          testPending={testMutation.isPending}
          canTest={configured}
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

function TelegramSettings() {
  const settings = useTelegramSettingsSuspense().data;
  return <TelegramForm key={settings.chatId ?? "none"} settings={settings} />;
}

export function TelegramSection() {
  const { t } = useTranslation();

  return (
    <>
      <p className="max-w-prose text-sm text-muted-foreground">
        {t("settings.telegram.description")}
      </p>
      <QueryBoundary fallback={<ChannelFormSkeleton fields={2} />}>
        <TelegramSettings />
      </QueryBoundary>
    </>
  );
}
