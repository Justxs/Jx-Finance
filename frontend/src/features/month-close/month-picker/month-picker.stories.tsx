import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent } from "storybook/test";
import { monthCloseYear } from "@/storybook/fixtures";
import { MonthPicker } from "./month-picker";

const meta = {
  title: "Features/MonthClose/MonthPicker",
  component: MonthPicker,
  parameters: { layout: "padded" },
  args: { month: "2026-08", months: monthCloseYear.months, onChange: fn() },
} satisfies Meta<typeof MonthPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: /Jul.*Changed after close/ })).toBeVisible();
    await expect(canvas.getByRole("button", { name: /Jun.*Closed/ })).toBeVisible();
  },
};

export const ChoosingAMonth: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: /Jul/ }));
    await expect(args.onChange).toHaveBeenCalledWith("2026-07");
    await userEvent.click(canvas.getByRole("button", { name: "Previous month" }));
    await expect(args.onChange).toHaveBeenCalledWith("2026-07");
  },
};
