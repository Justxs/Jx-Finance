import type { Meta, StoryObj } from "@storybook/react-vite";
import { withWidth } from "@/storybook/decorators";
import { emptyHandlers, errorHandlers, loadingHandlers } from "@/storybook/handlers";
import { SpendingPaceChart } from "./spending-pace-chart";

const meta = {
  title: "Features/Dashboard/SpendingPaceChart",
  component: SpendingPaceChart,
  decorators: [withWidth("panel")],
} satisfies Meta<typeof SpendingPaceChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };
