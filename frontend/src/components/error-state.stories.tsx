import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { ErrorState } from "./error-state";

function RetryExample() {
  const [attempts, setAttempts] = useState(0);

  return (
    <ErrorState
      message={`Could not load transactions. Attempts: ${attempts}.`}
      onRetry={() => setAttempts(attempts + 1)}
    />
  );
}

const meta = {
  title: "Components/ErrorState",
  component: ErrorState,
  args: { onRetry: () => undefined },
  decorators: [
    (Story) => (
      <section className="card w-[min(90vw,32rem)]">
        <Story />
      </section>
    ),
  ],
} satisfies Meta<typeof ErrorState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Retrying: Story = { args: { retrying: true } };

export const WithoutRetry: Story = { args: { onRetry: undefined } };

export const CustomMessage: Story = {
  args: { message: "The import file could not be read." },
};

export const LongMessage: Story = {
  args: {
    message:
      "The server took too long to respond while loading the yearly report for every account in every household, so nothing could be shown. Check your connection and try again in a moment.",
  },
};

export const CountsRetries: Story = { render: () => <RetryExample /> };
