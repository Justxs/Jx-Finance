import type { Meta, StoryObj } from "@storybook/react-vite";
import { withWidth } from "@/storybook/decorators";
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
  decorators: [withWidth("w-56")],
};
