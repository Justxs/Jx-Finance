import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";
import { i18n } from "@/lib/i18n";
import { locales, pageSizes, readPreferences } from "@/stores/preferences";
import { fonts, palettes, textSizes, themes } from "@/stores/theme-store";
import { AppearancePicker } from "./appearance-picker";

const meta = {
  title: "Components/AppearancePicker",
  component: AppearancePicker,
  parameters: { layout: "padded" },
} satisfies Meta<typeof AppearancePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole("radiogroup")).toEqual([
      canvas.getByRole("radiogroup", { name: "Theme" }),
      canvas.getByRole("radiogroup", { name: "Colors" }),
      canvas.getByRole("radiogroup", { name: "Language" }),
      canvas.getByRole("radiogroup", { name: "Typeface" }),
      canvas.getByRole("radiogroup", { name: "Text size" }),
      canvas.getByRole("radiogroup", { name: "Rows per page" }),
    ]);
    await expect(canvas.getAllByRole("radio")).toHaveLength(
      themes.length +
        palettes.length +
        locales.length +
        fonts.length +
        textSizes.length +
        pageSizes.length +
        1,
    );
    await expect(canvas.getByRole("radio", { name: "Light" })).toBeChecked();
    await expect(canvas.getByRole("radio", { name: "English" })).toBeChecked();
    await expect(canvas.getByRole("radio", { name: "Ledger navy" })).toBeChecked();
    await expect(canvas.getByRole("radio", { name: "Classic" })).toBeChecked();
    await expect(canvas.getByRole("radio", { name: "Default" })).toBeChecked();
  },
};

export const Dark: Story = { globals: { theme: "dark" } };

export const Lithuanian: Story = { globals: { locale: "lt" } };

export const ChoosePalette: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("radio", { name: "Sepia" }));
    await expect(canvas.getByRole("radio", { name: "Sepia" })).toBeChecked();
    await expect(document.documentElement.dataset.palette).toBe("sepia");
    await userEvent.click(canvas.getByRole("radio", { name: "Ledger navy" }));
    await expect(document.documentElement.dataset.palette).toBeUndefined();
  },
};

export const ChooseFontAndSize: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("radio", { name: "System" }));
    await userEvent.click(canvas.getByRole("radio", { name: "Large" }));
    await expect(canvas.getByRole("radio", { name: "System" })).toBeChecked();
    await expect(document.documentElement.dataset.font).toBe("system");
    await expect(document.documentElement.dataset.textSize).toBe("large");
    await userEvent.click(canvas.getByRole("radio", { name: "Classic" }));
    await userEvent.click(canvas.getByRole("radio", { name: "Default" }));
    await expect(document.documentElement.dataset.font).toBeUndefined();
    await expect(document.documentElement.dataset.textSize).toBeUndefined();
  },
};

export const ChooseThemeAndLanguage: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("radio", { name: "Dark" }));
    await expect(document.documentElement).toHaveClass("dark");
    await userEvent.click(canvas.getByRole("radio", { name: "Lietuvių" }));
    await expect(i18n.language).toBe("lt");
    await userEvent.click(canvas.getByRole("radio", { name: "Šviesi" }));
    await expect(document.documentElement).not.toHaveClass("dark");
    await userEvent.click(canvas.getByRole("radio", { name: "English" }));
    await expect(i18n.language).toBe("en");
  },
};

export const ChooseRowsPerPage: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("radio", { name: "Installation default (20)" })).toBeChecked();
    await userEvent.click(canvas.getByRole("radio", { name: "50" }));
    await expect(canvas.getByRole("radio", { name: "50" })).toBeChecked();
    await expect(readPreferences().pageSize).toBe(50);
    await userEvent.click(canvas.getByRole("radio", { name: "Installation default (20)" }));
    await expect(readPreferences().pageSize).toBeUndefined();
  },
};
