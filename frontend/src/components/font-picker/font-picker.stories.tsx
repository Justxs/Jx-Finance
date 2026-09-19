import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { FontPicker } from "./font-picker";

const meta = {
  title: "Components/FontPicker",
  component: FontPicker,
  parameters: { layout: "padded" },
} satisfies Meta<typeof FontPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Dark: Story = { globals: { theme: "dark" } };

export const Lithuanian: Story = { globals: { locale: "lt" } };

export const ChooseFontAndSize: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("radio", { name: "System" }));
    await userEvent.click(canvas.getByRole("radio", { name: "Large" }));
    await expect(document.documentElement.dataset.font).toBe("system");
    await expect(document.documentElement.dataset.textSize).toBe("large");
    await userEvent.click(canvas.getByRole("radio", { name: "Classic" }));
    await userEvent.click(canvas.getByRole("radio", { name: "Default" }));
    await expect(document.documentElement.dataset.font).toBeUndefined();
    await expect(document.documentElement.dataset.textSize).toBeUndefined();
  },
};
