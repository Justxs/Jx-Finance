import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  getDebtsMockHandler,
  getNetWorthHistoryMockHandler,
} from "@/api/generated/net-worth/net-worth.msw";
import { serverErrorProblem } from "@/storybook/fixtures";
import {
  emptyHandlers,
  errorHandlers,
  failWith,
  handlers,
  loadingHandlers,
} from "@/storybook/handlers";
import { NetWorthPage } from "./net-worth-page";

function NetWorthPageStory() {
  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-8">
      <NetWorthPage />
    </div>
  );
}

const meta = {
  title: "Features/NetWorth/NetWorthPage",
  component: NetWorthPage,
  parameters: { layout: "fullscreen", route: "/net-worth" },
  render: () => <NetWorthPageStory />,
} satisfies Meta<typeof NetWorthPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const OnlyHistoryFails: Story = {
  parameters: {
    msw: {
      handlers: [getNetWorthHistoryMockHandler(failWith(serverErrorProblem, 500)), ...handlers],
    },
  },
};

export const AssetsWithoutDebts: Story = {
  parameters: {
    msw: {
      handlers: [getDebtsMockHandler([]), ...handlers],
    },
  },
};
