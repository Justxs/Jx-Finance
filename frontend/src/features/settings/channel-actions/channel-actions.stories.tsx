import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent } from "storybook/test";
import { Button } from "@/components/ui/button/button";
import { ChannelActions } from "./channel-actions";

const meta = {
  title: "Features/Settings/ChannelActions",
  component: ChannelActions,
  parameters: { layout: "padded" },
  args: {
    error: null,
    testLabel: "Send a test message",
    testHint: "Save a webhook URL first.",
    testPending: false,
    canTest: true,
    onTest: fn(),
    children: <Button className="ml-auto">Save</Button>,
  },
} satisfies Meta<typeof ChannelActions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: /Send a test message/u }));
    await expect(args.onTest).toHaveBeenCalledOnce();
  },
};

export const NothingToTest: Story = {
  args: { canTest: false },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: /Send a test message/u }),
    ).toHaveAccessibleDescription("Save a webhook URL first.");
  },
};

export const Testing: Story = {
  args: { testPending: true },
};
