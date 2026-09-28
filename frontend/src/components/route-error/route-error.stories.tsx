import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";
import { withWidth } from "@/storybook/decorators";
import { RouteError } from "./route-error";

const meta = {
  title: "Components/RouteError",
  component: RouteError,
  parameters: { layout: "padded" },
} satisfies Meta<typeof RouteError>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithPageTitle: Story = { args: { title: "Transactions" } };

export const WithTechnicalDetails: Story = {
  args: { error: new TypeError("Failed to fetch") },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByText("Technical details"));
    await expect(canvas.getByText(/TypeError: Failed to fetch/)).toBeVisible();
  },
};

export const NarrowContainer: Story = {
  decorators: [withWidth("w-56")],
};
