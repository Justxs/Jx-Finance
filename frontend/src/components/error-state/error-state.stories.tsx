import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Card } from "@/components/ui/card";
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
  args: { onRetry: () => {} },
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

export const Default: Story = {};

export const WithoutRetry: Story = { args: { onRetry: undefined } };

export const CountsRetries: Story = { render: () => <RetryExample /> };
