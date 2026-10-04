import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { withWidth } from "@/storybook/decorators";
import { SampleLedger } from "./sample-ledger";

const meta = {
  title: "Features/Landing/SampleLedger",
  component: SampleLedger,
  decorators: [withWidth("panel")],
} satisfies Meta<typeof SampleLedger>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("region", { name: "Household account, September 2026" }),
    ).toBeVisible();
    await expect(canvas.getByText("+€2,840.00", { selector: "li span" })).toBeVisible();
    await expect(canvas.getByText("−€826.45")).toBeVisible();
  },
};

export const Lithuanian: Story = { globals: { locale: "lt" } };

export const Dark: Story = { globals: { theme: "dark" } };
