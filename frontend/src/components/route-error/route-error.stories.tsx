import type { Meta, StoryObj } from "@storybook/react-vite";
import { RouteError } from "./route-error";

const meta = {
  title: "Components/RouteError",
  component: RouteError,
  parameters: { layout: "padded" },
} satisfies Meta<typeof RouteError>;

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
