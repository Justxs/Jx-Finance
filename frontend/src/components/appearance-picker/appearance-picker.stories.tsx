import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor } from "storybook/test";
import { getSettingsMockHandler } from "@/api/generated/settings/settings.msw";
import { i18n } from "@/lib/i18n";
import { AMOUNT_MASK } from "@/lib/mask-amount";
import { locales, pageSizes, readPreferences, savePreferences } from "@/stores/preferences";
import { fonts, palettes, textSizes, themes } from "@/stores/theme-store";
import { SAMPLE_AMOUNT, withSampleAmount } from "@/storybook/decorators";
import { settingsWith } from "@/storybook/fixtures";
import { withHandlers } from "@/storybook/handlers";
import { AppearancePicker } from "./appearance-picker";

const meta = {
  title: "Components/AppearancePicker",
  component: AppearancePicker,
  parameters: { layout: "padded" },
  beforeEach() {
    savePreferences({ myShare: false });
  },
} satisfies Meta<typeof AppearancePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole("radiogroup")).toEqual([
      canvas.getByRole("radiogroup", { name: "Theme" }),
      canvas.getByRole("radiogroup", { name: "Colors" }),
      canvas.getByRole("radiogroup", { name: "Language" }),
      canvas.getByRole("radiogroup", { name: "Amounts" }),
      canvas.getByRole("radiogroup", { name: "Typeface" }),
      canvas.getByRole("radiogroup", { name: "Text size" }),
      canvas.getByRole("radiogroup", { name: "Rows per page" }),
      canvas.getByRole("radiogroup", { name: "Count" }),
    ]);
    await expect(canvas.getAllByRole("radio")).toHaveLength(
      themes.length +
        palettes.length +
        locales.length +
        2 +
        fonts.length +
        textSizes.length +
        pageSizes.length +
        1 +
        2,
    );
    await expect(canvas.getByRole("radio", { name: "Light" })).toBeChecked();
    await expect(canvas.getByRole("radio", { name: "English" })).toBeChecked();
    await expect(canvas.getByRole("radio", { name: "Shown" })).toBeChecked();
    await expect(canvas.getByRole("radio", { name: "Ledger navy" })).toBeChecked();
    await expect(canvas.getByRole("radio", { name: "Classic" })).toBeChecked();
    await expect(canvas.getByRole("radio", { name: "Default" })).toBeChecked();
    await expect(canvas.getByRole("radio", { name: "Full amount" })).toBeChecked();
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

export const HideAmounts: Story = {
  decorators: [withSampleAmount],
  play: async ({ canvas }) => {
    await expect(canvas.getByText(SAMPLE_AMOUNT)).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("radio", { name: "Hidden" }));
    await expect(canvas.getByRole("radio", { name: "Hidden" })).toBeChecked();
    await expect(readPreferences().amountsHidden).toBe(true);
    await expect(await canvas.findByText(`−€${AMOUNT_MASK}`)).toBeInTheDocument();
  },
};

export const ShowHiddenAmounts: Story = {
  globals: { amounts: "hidden" },
  decorators: [withSampleAmount],
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("radio", { name: "Hidden" })).toBeChecked();
    await expect(canvas.getByText(`−€${AMOUNT_MASK}`)).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("radio", { name: "Shown" }));
    await expect(readPreferences().amountsHidden).toBe(false);
    await expect(await canvas.findByText(SAMPLE_AMOUNT)).toBeInTheDocument();
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

export const ChooseMyShare: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("radio", { name: "My share" }));
    await expect(canvas.getByRole("radio", { name: "My share" })).toBeChecked();
    await expect(readPreferences().myShare).toBe(true);
    await userEvent.click(canvas.getByRole("radio", { name: "Full amount" }));
    await expect(readPreferences().myShare).toBe(false);
  },
};

export const WithoutHouseholds: Story = {
  parameters: withHandlers(
    getSettingsMockHandler(settingsWith({ features: { households: false } })),
  ),
  play: async ({ canvas }) => {
    await waitFor(() => expect(canvas.queryByRole("radiogroup", { name: "Count" })).toBeNull());
  },
};
