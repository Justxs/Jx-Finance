import type { Meta, StoryObj } from "@storybook/react-vite";
import { withWidth } from "@/storybook/decorators";
import { emptyHandlers, errorHandlers, loadingHandlers } from "@/storybook/handlers";
import { NetWorthCompositionChart } from "./net-worth-composition-chart";

const meta = {
  title: "Features/NetWorth/NetWorthCompositionChart",
  component: NetWorthCompositionChart,
  decorators: [withWidth("panel")],
} satisfies Meta<typeof NetWorthCompositionChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };
