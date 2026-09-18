import type { Meta, StoryObj } from "@storybook/react-vite";
import { http, HttpResponse } from "msw";
import { serverErrorProblem } from "@/storybook/fixtures";
import { emptyHandlers, errorHandlers, handlers, loadingHandlers } from "@/storybook/handlers";
import { DashboardPage } from "./dashboard-page";

function trendFailure() {
  return HttpResponse.json(serverErrorProblem, { status: 500 });
}

const meta = {
  title: "Features/Dashboard/DashboardPage",
  component: DashboardPage,
  parameters: { layout: "fullscreen" },
  render: () => (
    <div className="mx-auto max-w-6xl p-6">
      <DashboardPage />
    </div>
  ),
} satisfies Meta<typeof DashboardPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const PartialFailure: Story = {
  parameters: {
    msw: { handlers: [http.get("*/api/dashboard/monthly-trend", trendFailure), ...handlers] },
  },
};
