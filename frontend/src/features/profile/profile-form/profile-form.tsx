import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import { useUpdateMyProfile } from "@/api/generated";
import type { UserProfileResponse } from "@/api/generated/model";
import {
  updateMyProfileBodyDisplayNameMax,
  updateMyProfileBodyNewPasswordMin,
} from "@/api/schemas/users/users.zod";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { Section, SectionTitle } from "@/components/ui/section/section";
import { useEmailEnabled } from "@/hooks/use-settings";
import { silent } from "@/lib/mutations";
import { requiredText } from "@/lib/validation";

interface FormValues {
  displayName: string;
  currentPassword: string;
  newPassword: string;
  billReminderEmails: boolean;
}

interface Props {
  profile: UserProfileResponse;
}

export function ProfileForm({ profile }: Readonly<Props>) {
  const { t } = useTranslation();
  const emailEnabled = useEmailEnabled();

  let reminderHint = t("profile.notifications.billReminderEmailsHint");
  if (!emailEnabled) {
    reminderHint = t("profile.notifications.needsEmail");
  } else if (!profile.emailConfirmed) {
    reminderHint = t("profile.notifications.needsVerification");
  }

  const schema = z
    .object({
      displayName: requiredText(t, updateMyProfileBodyDisplayNameMax),
      currentPassword: z.string(),
      newPassword: z.string(),
      billReminderEmails: z.boolean(),
    })
    .refine(
      (value) =>
        value.newPassword === "" || value.newPassword.length >= updateMyProfileBodyNewPasswordMin,
      {
        message: t("validation.minLength", { min: updateMyProfileBodyNewPasswordMin }),
        path: ["newPassword"],
      },
    )
    .refine((value) => value.newPassword === "" || value.currentPassword !== "", {
      message: t("validation.required"),
      path: ["currentPassword"],
    });

  const updateMutation = useUpdateMyProfile(
    silent({
      onSuccess: () => {
        toast.success(t("profile.updated"));
        form.setFieldValue("currentPassword", "");
        form.setFieldValue("newPassword", "");
      },
    }),
  );

  const defaultValues: FormValues = {
    displayName: profile.displayName ?? "",
    currentPassword: "",
    newPassword: "",
    billReminderEmails: profile.billReminderEmails,
  };

  const form = useServerForm({
    defaultValues,
    schema,
    submit: (value) =>
      updateMutation.mutateAsync({
        data: {
          displayName: value.displayName.trim(),
          currentPassword: value.currentPassword || null,
          newPassword: value.newPassword || null,
          billReminderEmails: value.billReminderEmails,
        },
      }),
  });

  return (
    <form.AppForm>
      <form.FormShell as={Section} className="space-y-4 *:max-w-md">
        <SectionTitle>{t("profile.detailsTitle")}</SectionTitle>
        <form.Field name="displayName">
          {(field) => <field.TextField id="profile-display-name" label={t("users.displayName")} />}
        </form.Field>

        <form.Field name="currentPassword">
          {(field) => (
            <field.TextField
              id="profile-current-password"
              label={t("profile.currentPassword")}
              type="password"
            />
          )}
        </form.Field>

        <form.Field name="newPassword">
          {(field) => (
            <field.TextField
              id="profile-new-password"
              label={t("profile.newPassword")}
              type="password"
            />
          )}
        </form.Field>

        <fieldset className="border-t pt-4">
          <legend className="sr-only">{t("profile.notifications.title")}</legend>
          <p className="text-sm font-medium">{t("profile.notifications.title")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("profile.notifications.description")}
          </p>
          <form.Field name="billReminderEmails">
            {(field) => (
              <field.CheckboxField
                id="profile-bill-reminder-emails"
                className="mt-3"
                label={t("profile.notifications.billReminderEmails")}
                hint={reminderHint}
              />
            )}
          </form.Field>
        </fieldset>

        <FormError error={updateMutation.error} />

        <div className="flex justify-end">
          <form.SubmitButton pending={updateMutation.isPending}>
            {t("profile.save")}
          </form.SubmitButton>
        </div>
      </form.FormShell>
    </form.AppForm>
  );
}
