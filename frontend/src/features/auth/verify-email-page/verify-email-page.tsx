import { Link, useSearch } from "@tanstack/react-router";
import { CircleCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useVerifyEmail } from "@/api/generated";
import { Brand } from "@/components/brand/brand";
import { FormError } from "@/components/form-error/form-error";
import { Button } from "@/components/ui/button/button";
import { Card } from "@/components/ui/card/card";
import { silent } from "@/lib/mutations";

export function VerifyEmailPage() {
  const { t } = useTranslation();
  const { email, token } = useSearch({ from: "/verify-email" });

  const verifyMutation = useVerifyEmail(silent());
  const link = email && token ? { email, token } : null;
  const done = verifyMutation.isSuccess;

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 flex justify-center">
        <Brand size="lg" stacked />
      </div>
      <Card className="p-6 sm:p-8">
        <h1 className="text-lg font-semibold">{t("auth.verifyTitle")}</h1>

        <p className="mt-1 text-sm text-muted-foreground">
          {link ? link.email : t("auth.resetLinkBroken")}
        </p>

        {done ? (
          <p className="mt-5 flex gap-3 rounded-md bg-background px-4 py-3 text-sm" role="status">
            <CircleCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            {t("auth.verifyDone")}
          </p>
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

        <Link to="/login" className="mt-4 inline-block text-sm font-medium underline">
          {t("auth.backToSignIn")}
        </Link>
      </Card>
    </div>
  );
}
