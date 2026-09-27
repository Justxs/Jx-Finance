import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import { useUpdateDiscordSettings } from "@/api/generated";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { TitledSection } from "@/components/ui/section/section";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { usePublicSettings } from "@/hooks/use-settings";
import { silent } from "@/lib/mutations";

function DiscordSettingsForm({ enabled }: Readonly<{ enabled: boolean }>) {
  const { t } = useTranslation();
  const saveMutation = useUpdateDiscordSettings(
    silent({ onSuccess: () => toast.success(t("settings.discord.saved")) }),
  );

  const form = useServerForm({
    defaultValues: { enabled },
    schema: z.object({ enabled: z.boolean() }),
    submit: (value) => saveMutation.mutateAsync({ data: value }),
  });

  return (
    <form.AppForm>
      <form.FormShell className="mt-4 space-y-5">
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
        <FormError error={saveMutation.error} />
        <div className="flex justify-end">
          <form.SubmitButton pending={saveMutation.isPending}>
            {t("actions.save")}
          </form.SubmitButton>
        </div>
      </form.FormShell>
    </form.AppForm>
  );
}

export function DiscordSection() {
  const { t } = useTranslation();
  const settings = usePublicSettings();

  return (
    <TitledSection
      title={t("settings.discord.title")}
      description={t("settings.discord.description")}
    >
      {settings ? (
        <DiscordSettingsForm
          key={String(settings.discordEnabled)}
          enabled={settings.discordEnabled}
        />
      ) : (
        <Skeleton className="mt-4 h-24 w-full" />
      )}
    </TitledSection>
  );
}
