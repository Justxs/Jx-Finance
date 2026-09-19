import { useForm } from "@tanstack/react-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import { useUpdateMyProfileEndpoint } from "@/api/generated";
import type { UserProfileResponse } from "@/api/generated/model";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      displayName: z
        .string()
        .refine((value) => value.trim().length > 0, t("validation.required"))
        .refine((value) => value.trim().length <= 100, t("validation.maxLength", { max: 100 })),
      currentPassword: z.string(),
      newPassword: z.string(),
    })
    .refine((value) => value.newPassword === "" || value.newPassword.length >= 8, {
      message: t("validation.minLength", { min: 8 }),
      path: ["newPassword"],
    })
    .refine((value) => value.newPassword === "" || value.currentPassword !== "", {
      message: t("validation.required"),
      path: ["currentPassword"],
    });

  const updateMutation = useUpdateMyProfileEndpoint({
    mutation: {
      meta: { silent: true },
      onSuccess: () => {
        toast.success(t("profile.updated"));
        form.setFieldValue("currentPassword", "");
        form.setFieldValue("newPassword", "");
      },
    },
  });

  const defaultValues: FormValues = {
    displayName: profile.displayName ?? "",
    currentPassword: "",
    newPassword: "",
  };

  const form = useForm({
    defaultValues,
    validators: [{ run: schema, triggers: ["change"] }],
    onSubmit: ({ value }) => {
      updateMutation.mutate({
        data: {
          displayName: value.displayName.trim(),
          currentPassword: value.currentPassword || null,
          newPassword: value.newPassword || null,
        },
      });
    },
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
      noValidate
      className="section max-w-md space-y-4"
    >
      <h2 className="section-title">{t("profile.detailsTitle")}</h2>
      <form.Field name="displayName">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="profile-display-name">{t("users.displayName")}</Label>
            <Input
              id="profile-display-name"
              value={field.value}
              aria-invalid={field.errors.length > 0}
              aria-describedby={field.errors.length > 0 ? "profile-display-name-error" : undefined}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldError id="profile-display-name-error" message={field.errors[0]?.message} />
          </div>
        )}
      </form.Field>

      <form.Field name="currentPassword">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="profile-current-password">{t("profile.currentPassword")}</Label>
            <Input
              id="profile-current-password"
              type="password"
              value={field.value}
              aria-invalid={field.errors.length > 0}
              aria-describedby={
                field.errors.length > 0 ? "profile-current-password-error" : undefined
              }
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldError id="profile-current-password-error" message={field.errors[0]?.message} />
          </div>
        )}
      </form.Field>

      <form.Field name="newPassword">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="profile-new-password">{t("profile.newPassword")}</Label>
            <Input
              id="profile-new-password"
              type="password"
              value={field.value}
              aria-invalid={field.errors.length > 0}
              aria-describedby={field.errors.length > 0 ? "profile-new-password-error" : undefined}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldError id="profile-new-password-error" message={field.errors[0]?.message} />
          </div>
        )}
      </form.Field>

      <FormError error={updateMutation.error} />

      <form.Subscribe selector={(state) => state.canSubmit}>
        {(canSubmit) => (
          <div className="flex justify-end">
            <Button type="submit" pending={updateMutation.isPending} disabled={!canSubmit}>
              {t("profile.save")}
            </Button>
          </div>
        )}
      </form.Subscribe>
    </form>
  );
}
