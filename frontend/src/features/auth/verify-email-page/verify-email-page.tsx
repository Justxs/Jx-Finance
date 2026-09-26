import { useSearch } from "@tanstack/react-router";
import { CircleCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useVerifyEmail } from "@/api/generated";
import { FormError } from "@/components/form-error/form-error";
import { Button } from "@/components/ui/button/button";
import { silent } from "@/lib/mutations";
import { AuthCard, AuthNotice, BackToSignIn } from "../auth-card/auth-card";

export function VerifyEmailPage() {
  const { t } = useTranslation();
  const { email, token } = useSearch({ from: "/verify-email" });

  const verifyMutation = useVerifyEmail(silent());
  const link = email && token ? { email, token } : null;
  const done = verifyMutation.isSuccess;

  return (
    <AuthCard
      title={t("auth.verifyTitle")}
      subtitle={link ? link.email : t("auth.resetLinkBroken")}
    >
      {done ? (
        <AuthNotice icon={CircleCheck} className="mt-5">
          {t("auth.verifyDone")}
        </AuthNotice>
      ) : null}

      {link && !done ? (
        <div className="mt-5 space-y-4">
          <FormError error={verifyMutation.error} />
          <Button
            type="button"
            className="w-full"
            pending={verifyMutation.isPending}
            onClick={() => verifyMutation.mutate({ data: link })}
          >
            {t("auth.confirmAddress")}
          </Button>
        </div>
      ) : null}

      <BackToSignIn className="mt-4" />
    </AuthCard>
  );
}
