import type { Meta, StoryObj } from "@storybook/react-vite";
import { useTranslation } from "react-i18next";
import { expect, userEvent } from "storybook/test";
import { i18n } from "@/lib/i18n";
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

export const Default: Story = {
  play: async ({ canvas }) => {
    const toLithuanian = canvas.getByRole("button", { name: "EN, Lietuvių" });
    await expect(toLithuanian).toHaveAttribute("lang", "lt");
    await expect(toLithuanian).toHaveTextContent("en");

    await userEvent.click(toLithuanian);

    await expect(i18n.language).toBe("lt");
    await expect(canvas.getByRole("button", { name: "LT, English" })).toHaveTextContent("lt");
  },
};

export const WithTranslatedText: Story = { render: () => <LanguageToggleExample /> };
