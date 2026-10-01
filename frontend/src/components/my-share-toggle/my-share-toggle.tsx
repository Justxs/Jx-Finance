import { Split } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button/button";
import { useFeature } from "@/hooks/use-settings";
import { toggleMyShare, useMyShare } from "@/stores/my-share-store";

export function MyShareToggle() {
  const { t } = useTranslation();
  const householdsEnabled = useFeature("households");
  const myShare = useMyShare();

  if (!householdsEnabled) {
    return null;
  }

  return (
    <Button
      type="button"
      variant={myShare ? "default" : "outline"}
      aria-pressed={myShare}
      tooltip={t("households.myShare.hint")}
      onClick={toggleMyShare}
    >
      <Split />
      {t("households.myShare.label")}
    </Button>
  );
}
