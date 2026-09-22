import { createFileRoute } from "@tanstack/react-router";
import { ResetPasswordPage } from "@/features/auth/reset-password-page/reset-password-page";
import { emailTokenSearchSchema } from "@/lib/search-schema";

export const Route = createFileRoute("/reset-password")({
  validateSearch: emailTokenSearchSchema,
  component: ResetPasswordPage,
});
