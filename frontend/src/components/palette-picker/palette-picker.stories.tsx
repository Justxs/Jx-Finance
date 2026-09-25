import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";
import { palettes } from "@/stores/theme-store";
import { PalettePicker } from "./palette-picker";

const meta = {
  title: "Components/PalettePicker",
  component: PalettePicker,
  parameters: { layout: "padded" },
} satisfies Meta<typeof PalettePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const group = canvas.getByRole("radiogroup");
    await expect(group).toHaveAccessibleName();
    await expect(group).toHaveAccessibleDescription();
    await expect(canvas.getAllByRole("radio")).toHaveLength(palettes.length);
    await expect(canvas.getByRole("radio", { checked: true })).toBe(
      canvas.getByRole("radio", { name: "Ledger navy" }),
    );
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
