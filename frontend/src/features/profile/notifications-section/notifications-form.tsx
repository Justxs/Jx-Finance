import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import {
  useUpdateMyDigestScopes,
  useUpdateMyDiscordNotifications,
  useUpdateMyEmailNotifications,
} from "@/api/generated";
import { NotificationType } from "@/api/generated/model";
import type { HouseholdResponse, UserProfileResponse } from "@/api/generated/model";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { Section, SectionTitle } from "@/components/ui/section/section";
import { useDiscordEnabled, useEmailEnabled } from "@/hooks/use-settings";
import { silentMutation } from "@/lib/mutations";
import { NotificationChannelsFields, notificationChannels } from "./notification-channels-fields";

interface FormValues {
  email: NotificationType[];
  discord: NotificationType[];
  digestEverything: boolean;
  digestHouseholds: { id: string; chosen: boolean }[];
}

function sameKinds<T>(left: readonly T[], right: readonly T[]) {
  return left.length === right.length && left.every((kind) => right.includes(kind));
}

interface Props {
  profile: UserProfileResponse;
  households: HouseholdResponse[];
}

export function NotificationsForm({ profile, households }: Readonly<Props>) {
  const { t } = useTranslation();
  const available = { email: useEmailEnabled(), discord: useDiscordEnabled() };
  const channels = notificationChannels.filter((channel) => available[channel]);

  const emailMutation = useUpdateMyEmailNotifications({ mutation: silentMutation });
  const discordMutation = useUpdateMyDiscordNotifications({ mutation: silentMutation });
  const digestMutation = useUpdateMyDigestScopes({ mutation: silentMutation });

  const schema = z.object({
    email: z.array(z.enum(NotificationType)),
    discord: z.array(z.enum(NotificationType)),
    digestEverything: z.boolean(),
    digestHouseholds: z.array(z.object({ id: z.string(), chosen: z.boolean() })),
  });

  const defaultValues: FormValues = {
    email: [...profile.emailNotificationTypes],
    discord: [...profile.discordNotificationTypes],
    digestEverything: profile.monthlyDigestEverything,
    digestHouseholds: households.map((household) => ({
      id: household.id,
      chosen: profile.monthlyDigestHouseholdIds.includes(household.id),
    })),
  };

  const form = useServerForm({
    defaultValues,
    schema,
    submit: async (value, formApi) => {
      if (!sameKinds(value.email, profile.emailNotificationTypes)) {
        await emailMutation.mutateAsync({ data: { types: value.email } });
      }
      if (!sameKinds(value.discord, profile.discordNotificationTypes)) {
        await discordMutation.mutateAsync({ data: { types: value.discord } });
      }
      const householdIds = value.digestHouseholds
        .filter((household) => household.chosen)
        .map((household) => household.id);
      if (
        value.digestEverything !== profile.monthlyDigestEverything ||
        !sameKinds(householdIds, profile.monthlyDigestHouseholdIds)
      ) {
        await digestMutation.mutateAsync({
          data: { everything: value.digestEverything, householdIds },
        });
      }
      toast.success(t("profile.notifications.saved"));
      formApi.reset(value);
    },
  });

  const emailNote =
    available.email && !profile.emailConfirmed && t("profile.notifications.needsVerification");
  const notes = [channels.length > 0 && t("profile.notifications.digestNote"), emailNote].filter(
    Boolean,
  );

  return (
    <form.AppForm>
      <form.FormShell className="space-y-5">
        <Section aria-labelledby="notifications-title">
          <div className="max-w-prose space-y-1">
            <SectionTitle id="notifications-title">{t("profile.notifications.title")}</SectionTitle>
            <p className="text-sm text-muted-foreground">
              {t(
                channels.length > 0
                  ? "profile.notifications.description"
                  : "profile.notifications.descriptionInAppOnly",
              )}
            </p>
          </div>

          <NotificationChannelsFields
            form={form}
            fields={{ email: "email", discord: "discord" }}
            channels={channels}
            off={{ email: Boolean(emailNote), discord: false }}
          />

          {notes.length > 0 ? (
            <ul className="mt-4 max-w-prose space-y-1.5 text-sm text-muted-foreground">
              {notes.map((note) => (
                <li key={String(note)} className="flex gap-2">
                  <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  {note}
                </li>
              ))}
            </ul>
          ) : null}

          {channels.length > 0 && households.length > 0 ? (
            <fieldset className="mt-5 max-w-prose space-y-2.5">
              <legend className="text-sm font-medium">
                {t("profile.notifications.digestScopes")}
              </legend>
              <p className="text-sm text-muted-foreground">
                {t("profile.notifications.digestScopesHint")}
              </p>
              <form.Field name="digestEverything">
                {(field) => (
                  <field.CheckboxField
                    id="digest-everything"
                    label={t("households.scope.everything")}
                  />
                )}
              </form.Field>
              {households.map((household, index) => (
                <form.Field key={household.id} name={`digestHouseholds[${index}].chosen`}>
                  {(field) => (
                    <field.CheckboxField
                      id={`digest-household-${household.id}`}
                      label={household.name}
                    />
                  )}
                </form.Field>
              ))}
            </fieldset>
          ) : null}
        </Section>

        <FormError error={emailMutation.error ?? discordMutation.error ?? digestMutation.error} />

        {channels.length > 0 ? (
          <form.FormActions
            submitLabel={t("actions.save")}
            pending={
              emailMutation.isPending || discordMutation.isPending || digestMutation.isPending
            }
          />
        ) : null}
      </form.FormShell>
    </form.AppForm>
  );
}
