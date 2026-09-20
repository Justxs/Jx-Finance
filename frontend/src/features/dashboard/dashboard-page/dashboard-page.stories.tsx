import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { getMonthlyTrendMockHandler } from "@/api/generated/dashboard/dashboard.msw";
import { serverErrorProblem } from "@/storybook/fixtures";
import {
  emptyHandlers,
  errorHandlers,
  failWith,
  handlers,
  loadingHandlers,
} from "@/storybook/handlers";
import { DashboardPage } from "./dashboard-page";

const meta = {
  title: "Features/Dashboard/DashboardPage",
  component: DashboardPage,
  parameters: { layout: "fullscreen" },
  render: () => (
    <div className="p-6 lg:p-10">
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
    msw: {
      handlers: [getMonthlyTrendMockHandler(failWith(serverErrorProblem, 500)), ...handlers],
    },
  },
};

export const AllSectionsLoad: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const heading = await canvas.findByRole("heading", {
      name: /recent transactions|paskutinės operacijos/i,
    });
    const recent = within(heading.closest("section")!);

    await expect((await recent.findAllByRole("listitem")).length).toBeGreaterThan(0);
    await expect(canvas.queryAllByRole("alert")).toHaveLength(0);
  },
};

export const RetryRecoversFailedSection: Story = {
  parameters: {
    msw: {
      handlers: [
        getMonthlyTrendMockHandler(failWith(serverErrorProblem, 500), { once: true }),
        ...handlers,
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const failed = await canvas.findByRole("alert");
    await expect(failed).toHaveTextContent(/income vs\. expenses|pajamos ir išlaidos/i);

    await userEvent.click(
      within(failed).getByRole("button", { name: /try again|bandyti dar kartą/i }),
    );

    await waitFor(() => expect(canvas.queryAllByRole("alert")).toHaveLength(0));
  },
};
