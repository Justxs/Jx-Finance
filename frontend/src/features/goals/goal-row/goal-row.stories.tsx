import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn, userEvent, within } from "storybook/test";
import { getUpdateGoalMockHandler } from "@/api/generated/goals/goals.msw";
import { Rows } from "@/components/ui/rows";
import { completedGoal, goalWithTargetDate, openEndedGoal } from "@/storybook/fixtures";
import { handlers, pending } from "@/storybook/handlers";
import { openedDialog } from "@/storybook/interactions";
import { GoalRow } from "./goal-row";

const meta = {
  title: "Features/Goals/GoalRow",
  component: GoalRow,
  args: {
    goal: goalWithTargetDate,
    onDelete: fn(),
    deletePending: false,
    deleteDisabled: false,
  },
  decorators: [
    function withList(Story) {
      return (
        <Rows className="w-[min(48rem,calc(100vw-3rem))]">
          <Story />
        </Rows>
      );
    },
  ],
} satisfies Meta<typeof GoalRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const OpenEndedLongName: Story = { args: { goal: openEndedGoal } };

export const Completed: Story = { args: { goal: completedGoal } };

export const OverAchieved: Story = {
  args: { goal: { ...completedGoal, currentAmount: "1250.00" } },
};

export const NotStarted: Story = {
  args: { goal: { ...goalWithTargetDate, currentAmount: "0.00" } },
};

export const DeletePending: Story = { args: { deletePending: true, deleteDisabled: true } };

export const DeleteDisabled: Story = { args: { deleteDisabled: true } };

export const EditDialogOpen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /^(edit|redaguoti):/i }));
    await openedDialog();
  },
};

export const EditInvalid: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /^(edit|redaguoti):/i }));
    const dialog = within(await within(document.body).findByRole("dialog"));
    await userEvent.clear(dialog.getAllByRole("textbox")[0]!);
  },
};

export const SavePending: Story = {
  parameters: {
    msw: {
      handlers: [getUpdateGoalMockHandler(pending), ...handlers],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /^(edit|redaguoti):/i }));
    const dialog = within(await within(document.body).findByRole("dialog"));
    await userEvent.click(dialog.getByRole("button", { name: /^(save|išsaugoti)$/i }));
  },
};
