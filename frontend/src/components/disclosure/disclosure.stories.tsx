import type { Meta, StoryObj } from "@storybook/react-vite";
import { Disclosure } from "./disclosure";

const meta = {
  title: "Components/Disclosure",
  component: Disclosure,
  args: {
    summary: "Closed positions (3)",
    children: (
      <p className="max-w-prose text-sm text-muted-foreground">
        Positions you have fully sold stay here with their realized gain and dividends.
      </p>
    ),
  },
} satisfies Meta<typeof Disclosure>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const DefaultOpen: Story = { args: { defaultOpen: true } };

export const Divided: Story = {
  args: { className: "mt-6 border-t pt-3 text-sm", summary: "How do I set up a Flex Query?" },
};
