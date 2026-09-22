import { MailWarning } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useMe, useSendVerificationEmail } from "@/api/generated";
import { Button } from "@/components/ui/button/button";
import { useEmailEnabled } from "@/hooks/use-settings";
import { silent } from "@/lib/mutations";

export function EmailVerificationBanner() {
  const { t } = useTranslation();
  const emailEnabled = useEmailEnabled();
  const me = useMe({ query: { throwOnError: false, meta: { silent: true } } });

  const resendMutation = useSendVerificationEmail(
    silent({
      onSuccess: () => {
        toast.success(t("profile.verificationSent"));
      },
    }),
  );

  const profile = me.data;
  if (!emailEnabled || !profile || profile.emailConfirmed) {
    return null;
  }

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-dashed bg-sidebar px-4 py-3"
    >
      <MailWarning className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{t("profile.emailUnconfirmedTitle")}</p>
        <p className="text-sm text-muted-foreground">
          {t("profile.emailUnconfirmedBody", { email: profile.email })}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        pending={resendMutation.isPending}
        onClick={() => resendMutation.mutate()}
      >
        {t("profile.resendVerification")}
      </Button>
    </div>
  );
}
