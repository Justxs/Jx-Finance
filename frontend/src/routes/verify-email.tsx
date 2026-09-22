import { createFileRoute } from "@tanstack/react-router";
import { VerifyEmailPage } from "@/features/auth/verify-email-page/verify-email-page";
import { emailTokenSearchSchema } from "@/lib/search-schema";

export const Route = createFileRoute("/verify-email")({
  validateSearch: emailTokenSearchSchema,
  component: VerifyEmailPage,
});
