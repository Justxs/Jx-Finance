import type { Meta, StoryObj } from "@storybook/react-vite";
import { RoutePending } from "./route-pending";

const meta = {
  title: "Components/RoutePending",
  component: RoutePending,
  parameters: { layout: "padded" },
} satisfies Meta<typeof RoutePending>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NarrowContainer: Story = {
  decorators: [
    (Story) => (
      <div className="w-56">
        <Story />
      </div>
    ),
  ],
};
