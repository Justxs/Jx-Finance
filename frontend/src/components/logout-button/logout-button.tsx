import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLogout } from "@/api/generated";
import { Button } from "@/components/ui/button/button";
import { endSession } from "@/lib/auth-gate";

export function LogoutButton() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const logoutMutation = useLogout({
    mutation: {
      onSuccess: () => endSession(queryClient, navigate),
    },
  });

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      pending={logoutMutation.isPending}
      onClick={() => logoutMutation.mutate()}
      aria-label={t("auth.logout")}
    >
      <LogOut />
    </Button>
  );
}
