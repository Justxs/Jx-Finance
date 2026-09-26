import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";
import { fonts, palettes, textSizes } from "@/stores/theme-store";
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
    const palette = canvas.getByRole("radiogroup", { name: "Appearance" });
    await expect(palette).toHaveAccessibleDescription();
    await expect(canvas.getAllByRole("radiogroup")).toEqual([
      palette,
      canvas.getByRole("radiogroup", { name: "Typeface" }),
      canvas.getByRole("radiogroup", { name: "Text size" }),
    ]);
    await expect(canvas.getAllByRole("radio")).toHaveLength(
      palettes.length + fonts.length + textSizes.length,
    );
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
