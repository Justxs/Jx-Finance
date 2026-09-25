import type { Meta, StoryObj } from "@storybook/react-vite";
import { withWidth } from "@/storybook/decorators";
import { emptyHandlers, errorHandlers, loadingHandlers } from "@/storybook/handlers";
import { UpcomingBills } from "./upcoming-bills";

const meta = {
  title: "Features/Dashboard/UpcomingBills",
  component: UpcomingBills,
  decorators: [withWidth("column")],
} satisfies Meta<typeof UpcomingBills>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };
