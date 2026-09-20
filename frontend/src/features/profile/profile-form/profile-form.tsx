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
import { silent } from "@/lib/mutations";
import { requiredText } from "@/lib/validation";

interface FormValues {
  displayName: string;
  currentPassword: string;
  newPassword: string;
}

interface Props {
  profile: UserProfileResponse;
}

export function ProfileForm({ profile }: Readonly<Props>) {
  const { t } = useTranslation();

  const schema = z
    .object({
      displayName: requiredText(t, updateMyProfileBodyDisplayNameMax),
      currentPassword: z.string(),
      newPassword: z.string(),
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
