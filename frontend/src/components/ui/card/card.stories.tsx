import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card } from "./card";

const meta = {
  title: "UI/Card",
  component: Card,
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-80 p-6">
      <p className="text-sm font-medium">Sign in</p>
      <p className="mt-1 text-sm text-muted-foreground">
        A card holds an object that stands apart from the page.
      </p>
    </Card>
  ),
};

export const AsSection: Story = {
  render: () => (
    <Card as="section" aria-label="Summary" className="w-80 p-4">
      <p className="text-sm">Rendered as a section element.</p>
    </Card>
  ),
};
