import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  getDebtsMockHandler,
  getNetWorthHistoryMockHandler,
} from "@/api/generated/net-worth/net-worth.msw";
import { withPageFrame } from "@/storybook/decorators";
import { serverErrorProblem } from "@/storybook/fixtures";
import {
  emptyHandlers,
  errorHandlers,
  failWith,
  loadingHandlers,
  withHandlers,
} from "@/storybook/handlers";
import { NetWorthPage } from "./net-worth-page";

const meta = {
  title: "Features/NetWorth/NetWorthPage",
  component: NetWorthPage,
  parameters: { layout: "fullscreen", route: "/net-worth" },
  decorators: [withPageFrame],
} satisfies Meta<typeof NetWorthPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const OnlyHistoryFails: Story = {
  parameters: withHandlers(getNetWorthHistoryMockHandler(failWith(serverErrorProblem))),
};

export const AssetsWithoutDebts: Story = {
  parameters: withHandlers(getDebtsMockHandler([])),
};
