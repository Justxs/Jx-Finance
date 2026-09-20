import type { Meta, StoryObj } from "@storybook/react-vite";
import { userEvent, within } from "storybook/test";
import { getDeleteGoalMockHandler, getGoalsMockHandler } from "@/api/generated/goals/goals.msw";
import { QueryBoundary } from "@/components/query-boundary";
import { RoutePending } from "@/components/route-pending";
import { completedGoal, goals, openEndedGoal, cycle } from "@/storybook/fixtures";
import {
  emptyHandlers,
  errorHandlers,
  handlers,
  loadingHandlers,
  pending,
} from "@/storybook/handlers";
import { openedDialog } from "@/storybook/interactions";
import { GoalsPage } from "./goals-page";

function GoalsPageStory() {
  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-8">
      <QueryBoundary fallback={<RoutePending />}>
        <GoalsPage />
      </QueryBoundary>
    </div>
  );
}

const manyGoals = Array.from({ length: 12 }, (_, index) => ({
  ...cycle(goals, index),
  id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
}));

const meta = {
  title: "Features/Goals/GoalsPage",
  component: GoalsPage,
  parameters: { layout: "fullscreen", route: "/goals" },
  render: () => <GoalsPageStory />,
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
