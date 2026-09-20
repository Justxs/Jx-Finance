import type { Meta, StoryObj } from "@storybook/react-vite";
import { withWidth } from "@/storybook/decorators";
import { RouteError } from "./route-error";

const meta = {
  title: "Components/RouteError",
  component: RouteError,
  parameters: { layout: "padded" },
} satisfies Meta<typeof RouteError>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithPageTitle: Story = { args: { title: "Transactions" } };

export const NarrowContainer: Story = {
  decorators: [withWidth("w-56")],
};
