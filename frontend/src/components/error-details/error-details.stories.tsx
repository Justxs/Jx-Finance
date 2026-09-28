import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";
import { ApiError } from "@/api/client";
import { ErrorDetails } from "./error-details";

const meta = {
  title: "Components/ErrorDetails",
  component: ErrorDetails,
  args: { error: new TypeError("Failed to fetch") },
} satisfies Meta<typeof ErrorDetails>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByText("Technical details"));
    await expect(canvas.getByText(/TypeError: Failed to fetch/)).toBeVisible();
  },
};

export const ServerProblem: Story = {
  args: {
    error: new ApiError({
      status: 500,
      title: "Internal Server Error",
      detail: "Database timeout",
    }),
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByText("Technical details"));
    await expect(canvas.getByText(/HTTP 500/)).toHaveTextContent("ApiError: Database timeout");
  },
};

export const ThrownValue: Story = { args: { error: "Unexpected response" } };

export const NothingCaught: Story = {
  args: { error: undefined },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText("Technical details")).toBeNull();
  },
};
