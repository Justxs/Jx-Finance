import type { Meta, StoryObj } from "@storybook/react-vite";
import { userEvent, within } from "storybook/test";
import { getDeleteGoalMockHandler, getGoalsMockHandler } from "@/api/generated/goals/goals.msw";
import { withPageFrame } from "@/storybook/decorators";
import { completedGoal, goals, openEndedGoal, many } from "@/storybook/fixtures";
import {
  emptyHandlers,
  errorHandlers,
  handlers,
  loadingHandlers,
  pending,
} from "@/storybook/handlers";
import { openedDialog } from "@/storybook/interactions";
import { GoalsPage } from "./goals-page";

const manyGoals = many(goals, 12);

const meta = {
  title: "Features/Goals/GoalsPage",
  component: GoalsPage,
  parameters: { layout: "fullscreen", route: "/goals" },
  decorators: [withPageFrame],
} satisfies Meta<typeof GoalsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const SingleCompletedGoal: Story = {
  parameters: {
    msw: {
      handlers: [getGoalsMockHandler([completedGoal]), ...handlers],
    },
  },
};

export const LongList: Story = {
  parameters: {
    msw: {
      handlers: [getGoalsMockHandler([openEndedGoal, ...manyGoals]), ...handlers],
    },
  },
};

export const AddDialogOpen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: /add goal|pridėti tikslą/i }));
    await openedDialog();
  },
};

export const DeletePending: Story = {
  parameters: {
    msw: {
      handlers: [getDeleteGoalMockHandler(pending), ...handlers],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const deleteButtons = await canvas.findAllByRole("button", {
      name: /^(delete|ištrinti)(:|$)/i,
    });
    await userEvent.click(deleteButtons[0]!);
    const dialog = await within(document.body).findByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: /delete|ištrinti/i }));
  },
};
