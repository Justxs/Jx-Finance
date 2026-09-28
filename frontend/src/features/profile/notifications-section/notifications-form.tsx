import { Check, Info, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import {
  useDeleteMyDiscord,
  useTestMyDiscord,
  useUpdateMyDiscord,
  useUpdateMyEmailNotifications,
} from "@/api/generated";
import { NotificationType } from "@/api/generated/model";
import type { DiscordWebhookResponse, UserProfileResponse } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { Button } from "@/components/ui/button/button";
import { Checkbox } from "@/components/ui/checkbox/checkbox";
import { Section, SectionTitle } from "@/components/ui/section/section";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table/table";
import { useDateTime } from "@/hooks/use-formatters";
import { useDiscordEnabled, useEmailEnabled } from "@/hooks/use-settings";
import { silent } from "@/lib/mutations";

const webhookPattern =
  /^https:\/\/(?:discord\.com|discordapp\.com|ptb\.discord\.com|canary\.discord\.com)\/api\/webhooks\/\d{1,20}\/[\w-]{1,100}$/iu;

const kinds = Object.values(NotificationType);

interface FormValues {
  email: NotificationType[];
  discord: NotificationType[];
  webhookUrl: string;
  discordEnabled: boolean;
}

function toggled(list: readonly NotificationType[], kind: NotificationType, on: boolean) {
  return kinds.filter((entry) => (entry === kind ? on : list.includes(entry)));
}

function sameKinds(left: readonly NotificationType[], right: readonly NotificationType[]) {
  return left.length === right.length && left.every((kind) => right.includes(kind));
}

interface Props {
  profile: UserProfileResponse;
  discord: DiscordWebhookResponse;
}

export function NotificationsForm({ profile, discord }: Readonly<Props>) {
  const { t } = useTranslation();
  const formatDateTime = useDateTime();
  const emailServer = useEmailEnabled();
  const discordAllowed = useDiscordEnabled();
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const emailMutation = useUpdateMyEmailNotifications(silent());
  const discordMutation = useUpdateMyDiscord(silent());
  const testMutation = useTestMyDiscord(
    silent({ onSuccess: () => toast.success(t("profile.discord.testSent")) }),
  );
  const removeMutation = useDeleteMyDiscord(
    silent({ onSuccess: () => toast.success(t("profile.discord.removed")) }),
  );

  const schema = z.object({
    email: z.array(z.enum(NotificationType)),
    discord: z.array(z.enum(NotificationType)),
    webhookUrl: z
      .string()
      .refine((value) => value.trim() === "" || webhookPattern.test(value.trim()), {
        message: t("serverErrors.discord.invalidWebhook"),
      }),
    discordEnabled: z.boolean(),
  });

  const defaultValues: FormValues = {
    email: [...profile.emailNotificationTypes],
    discord: [...discord.types],
    webhookUrl: "",
    discordEnabled: discord.hasWebhook ? discord.isEnabled : true,
  };

  const form = useServerForm({
    defaultValues,
    schema,
    submit: async (value, formApi) => {
      const webhookUrl = value.webhookUrl.trim();
      if (!sameKinds(value.email, profile.emailNotificationTypes)) {
        await emailMutation.mutateAsync({ data: { types: value.email } });
      }
      const discordChanged =
        webhookUrl !== "" ||
        value.discordEnabled !== discord.isEnabled ||
        !sameKinds(value.discord, discord.types);
      if (discordChanged && (discord.hasWebhook || webhookUrl !== "")) {
        await discordMutation.mutateAsync({
          data: {
            webhookUrl: webhookUrl || null,
            isEnabled: value.discordEnabled,
            types: value.discord,
          },
        });
      }
      toast.success(t("profile.notifications.saved"));
      formApi.reset({ ...value, webhookUrl: "" });
    },
  });

  const emailNote =
    (!emailServer && t("profile.notifications.needsEmail")) ||
    (!profile.emailConfirmed && t("profile.notifications.needsVerification"));
  const emailOff = Boolean(emailNote);

  const problem =
    (discord.unreadable && t("profile.discord.unreadable")) ||
    (discord.disabledByDiscord && t("profile.discord.gone"));

  const delivery =
    discord.hasWebhook &&
    (discord.lastDeliveredAt
      ? t("profile.discord.lastDelivered", { date: formatDateTime(discord.lastDeliveredAt) })
      : t("profile.discord.neverDelivered"));

  return (
    <form.AppForm>
      <form.FormShell className="space-y-5">
        <Section aria-labelledby="notifications-title">
          <div className="max-w-prose space-y-1">
            <SectionTitle id="notifications-title">{t("profile.notifications.title")}</SectionTitle>
            <p className="text-sm text-muted-foreground">
              {t("profile.notifications.description")}
            </p>
          </div>

          <form.Subscribe selector={(state) => state.values.discordEnabled}>
            {(discordEnabled) => {
              const discordNote =
                (!discordAllowed && t("profile.notifications.discordNotAllowed")) ||
                (!discord.hasWebhook && t("profile.notifications.discordNotConnected")) ||
                (!discordEnabled && t("profile.notifications.discordPaused"));
              const discordOff = Boolean(discordNote);

              return (
                <>
                  <form.Field name="email">
                    {(emailField) => (
                      <form.Field name="discord">
                        {(discordField) => (
                          <div className="-mx-3 mt-4 max-w-3xl">
                            <Table className="table-fixed">
                              <TableHeader>
                                <TableRow>
                                  <TableHead>{t("profile.notifications.kind")}</TableHead>
                                  <TableHead className="w-16 text-center sm:w-24">
                                    {t("profile.notifications.inApp")}
                                  </TableHead>
                                  <TableHead className="w-16 text-center sm:w-24">
                                    {t("profile.notifications.email")}
                                  </TableHead>
                                  <TableHead className="w-16 text-center sm:w-24">
                                    {t("profile.notifications.discord")}
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {kinds.map((kind) => {
                                  const name = t(`notifications.kinds.${kind}`);
                                  return (
                                    <TableRow key={kind}>
                                      <TableCell className="whitespace-normal">{name}</TableCell>
                                      <TableCell>
                                        <Check
                                          role="img"
                                          aria-label={t("profile.notifications.alwaysInApp")}
                                          className="mx-auto size-4 text-muted-foreground"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Checkbox
                                          className="mx-auto"
                                          aria-label={t("profile.notifications.byEmail", {
                                            kind: name,
                                          })}
                                          disabled={emailOff}
                                          checked={emailField.value.includes(kind)}
                                          onCheckedChange={(on) =>
                                            emailField.handleChange(
                                              toggled(emailField.value, kind, on),
                                            )
                                          }
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Checkbox
                                          className="mx-auto"
                                          aria-label={t("profile.notifications.byDiscord", {
                                            kind: name,
                                          })}
                                          disabled={discordOff}
                                          checked={discordField.value.includes(kind)}
                                          onCheckedChange={(on) =>
                                            discordField.handleChange(
                                              toggled(discordField.value, kind, on),
                                            )
                                          }
                                        />
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </form.Field>
                    )}
                  </form.Field>

                  {emailNote || discordNote ? (
                    <ul className="mt-4 max-w-prose space-y-1.5 text-sm text-muted-foreground">
                      {[emailNote, discordNote].filter(Boolean).map((note) => (
                        <li key={String(note)} className="flex gap-2">
                          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                          {note}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
              );
            }}
          </form.Subscribe>
        </Section>

        <Section aria-labelledby="discord-title" className="space-y-5">
          <div className="max-w-prose space-y-1">
            <SectionTitle id="discord-title">{t("profile.discord.title")}</SectionTitle>
            <p className="text-sm text-muted-foreground">{t("profile.discord.description")}</p>
          </div>

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
                  disabled={!discordAllowed}
                  label={t("profile.discord.webhookUrl")}
                  hint={t("profile.discord.webhookUrlHint")}
                  placeholder={
                    discord.hasWebhook ? t("profile.discord.webhookPlaceholder") : undefined
                  }
                />
              )}
            </form.Field>

            <form.Field name="discordEnabled">
              {(field) => (
                <field.CheckboxField
                  id="discord-is-enabled"
                  disabled={!discordAllowed}
                  label={t("profile.discord.enabled")}
                />
              )}
            </form.Field>
          </div>

          {delivery || discord.lastError ? (
            <div className="max-w-prose space-y-0.5 text-sm text-muted-foreground">
              {delivery ? <p>{delivery}</p> : null}
              {discord.lastError && !problem ? (
                <p className="wrap-break-word">
                  {t("profile.discord.lastError", { error: discord.lastError })}
                </p>
              ) : null}
            </div>
          ) : null}

          {discord.hasWebhook ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                pending={testMutation.isPending}
                disabled={!discordAllowed}
                onClick={() => {
                  removeMutation.reset();
                  testMutation.reset();
                  testMutation.mutate();
                }}
              >
                <Send />
                {t("profile.discord.test")}
              </Button>
              <Button
                type="button"
                variant="outline-destructive"
                size="sm"
                pending={removeMutation.isPending}
                onClick={() => setConfirmingRemove(true)}
              >
                <Trash2 />
                {t("profile.discord.remove")}
              </Button>
            </div>
          ) : null}
        </Section>

        <FormError
          error={
            emailMutation.error ??
            discordMutation.error ??
            testMutation.error ??
            removeMutation.error
          }
        />

        <div className="flex justify-end">
          <form.SubmitButton pending={emailMutation.isPending || discordMutation.isPending}>
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
