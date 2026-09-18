import type { Meta, StoryObj } from "@storybook/react-vite";
import { useTranslation } from "react-i18next";
import { LanguageToggle } from "./language-toggle";

function LanguageToggleExample() {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3">
      <LanguageToggle />
      <span className="text-sm text-muted-foreground">{t("nav.dashboard")}</span>
    </div>
  );
}

const meta = {
  title: "Components/LanguageToggle",
  component: LanguageToggle,
} satisfies Meta<typeof LanguageToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithTranslatedText: Story = { render: () => <LanguageToggleExample /> };
