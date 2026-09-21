import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { VerifyEmailPage } from "@/features/auth/verify-email-page/verify-email-page";

export const verifyEmailSearchSchema = z.object({
  email: z.string().optional().catch(undefined),
  token: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/verify-email")({
  validateSearch: verifyEmailSearchSchema,
  component: VerifyEmailPage,
});
