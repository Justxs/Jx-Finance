import type { Meta, StoryObj } from "@storybook/react-vite";
import { TextLink } from "./text-link";

const meta = {
  title: "UI/TextLink",
  component: TextLink,
} satisfies Meta<typeof TextLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InASentence: Story = {
  render: () => (
    <p className="text-sm text-muted-foreground">
      No budgets yet. <TextLink to="/budgets">Add a budget</TextLink>
    </p>
  ),
};
