import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";
import { fonts, textSizes } from "@/stores/theme-store";
import { FontPicker } from "./font-picker";

const meta = {
  title: "Components/FontPicker",
  component: FontPicker,
  parameters: { layout: "padded" },
} satisfies Meta<typeof FontPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole("radiogroup")).toEqual([
      canvas.getByRole("radiogroup", { name: "Typeface" }),
      canvas.getByRole("radiogroup", { name: "Text size" }),
    ]);
    await expect(canvas.getAllByRole("radio")).toHaveLength(fonts.length + textSizes.length);
    await expect(canvas.getByRole("radio", { name: "Classic" })).toBeChecked();
    await expect(canvas.getByRole("radio", { name: "Default" })).toBeChecked();
  },
};

export const Dark: Story = { globals: { theme: "dark" } };

export const Lithuanian: Story = { globals: { locale: "lt" } };

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
