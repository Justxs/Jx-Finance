import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";
import { PalettePicker } from "./palette-picker";

const meta = {
  title: "Components/PalettePicker",
  component: PalettePicker,
  parameters: { layout: "padded" },
} satisfies Meta<typeof PalettePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Dark: Story = { globals: { theme: "dark" } };

export const Lithuanian: Story = { globals: { locale: "lt" } };

export const ChoosePalette: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("radio", { name: "Sepia" }));
    await expect(document.documentElement.dataset.palette).toBe("sepia");
    await userEvent.click(canvas.getByRole("radio", { name: "Ledger navy" }));
    await expect(document.documentElement.dataset.palette).toBeUndefined();
  },
};
