import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ResetPasswordPage } from "@/features/auth/reset-password-page/reset-password-page";

export const resetPasswordSearchSchema = z.object({
  email: z.string().optional().catch(undefined),
  token: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/reset-password")({
  validateSearch: resetPasswordSearchSchema,
  component: ResetPasswordPage,
});
