import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent } from "storybook/test";
import { Card } from "@/components/ui/card/card";
import { ErrorState } from "./error-state";

function RetryExample() {
  const [attempts, setAttempts] = useState(0);

  return (
    <div>
      <ErrorState onRetry={() => setAttempts(attempts + 1)} />
      <p className="text-xs text-muted-foreground">Attempts: {attempts}</p>
    </div>
  );
}

const meta = {
  title: "Components/ErrorState",
  component: ErrorState,
  args: { onRetry: fn() },
  decorators: [
    (Story) => (
      <Card as="section" className="w-[min(90vw,32rem)]">
        <Story />
      </Card>
    ),
  ],
} satisfies Meta<typeof ErrorState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Try again" }));
    await expect(args.onRetry).toHaveBeenCalledOnce();
  },
};

export const WithoutRetry: Story = {
  args: { onRetry: undefined },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent("Could not load this.");
    await expect(canvas.queryByRole("button")).toBeNull();
  },
};

export const CountsRetries: Story = { render: () => <RetryExample /> };
