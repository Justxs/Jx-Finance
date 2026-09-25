import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, userEvent, within } from "storybook/test";
import {
  getDeleteGoalMockHandler,
  getGoalsMockHandler,
  getUpdateGoalMockHandler,
} from "@/api/generated/goals/goals.msw";
import { withPageFrame } from "@/storybook/decorators";
import {
  completedGoal,
  goals,
  openEndedGoal,
  many,
  unavailableFundedGoal,
} from "@/storybook/fixtures";
import {
  emptyHandlers,
  errorHandlers,
  loadingHandlers,
  pending,
  withHandlers,
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
  parameters: withHandlers(getGoalsMockHandler([completedGoal])),
};

export const WithUnavailableFunding: Story = {
  parameters: withHandlers(getGoalsMockHandler([...goals, unavailableFundedGoal])),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText(/progress unavailable|pažanga nepasiekiama/i),
    ).toBeVisible();
  },
};

export const LongList: Story = {
  parameters: withHandlers(getGoalsMockHandler([openEndedGoal, ...manyGoals])),
};

export const AddDialogOpen: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: /add goal|pridėti tikslą/i }));
    await openedDialog();
  },
};

export const EditDialogOpen: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(
      (await canvas.findAllByRole("button", { name: /^(edit|redaguoti):/i }))[0]!,
    );
    await openedDialog();
  },
};

export const EditInvalid: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(
      (await canvas.findAllByRole("button", { name: /^(edit|redaguoti):/i }))[0]!,
    );
    const dialog = within(await openedDialog());
    await userEvent.clear(dialog.getAllByRole("textbox")[0]!);
  },
};

export const EditSavePending: Story = {
  parameters: withHandlers(getUpdateGoalMockHandler(pending)),
  play: async ({ canvas }) => {
    await userEvent.click(
      (await canvas.findAllByRole("button", { name: /^(edit|redaguoti):/i }))[0]!,
    );
    const dialog = within(await openedDialog());
    await userEvent.click(dialog.getByRole("button", { name: /^(save|išsaugoti)$/i }));
  },
};

export const DeleteOffersUndo: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(
      (await canvas.findAllByRole("button", { name: /^(delete|ištrinti)(:|$)/i }))[0]!,
    );
    const dialog = await openedDialog("alertdialog");
    await expect(
      within(dialog).getByText(/you can undo this straight away|veiksmą galėsite atšaukti/i),
    ).toBeVisible();
    await userEvent.click(within(dialog).getByRole("button", { name: /delete|ištrinti/i }));

    const undo = await screen.findByRole("button", { name: /^(undo|atšaukti)$/i });
    await userEvent.click(undo);

    await expect(await screen.findByText(/brought back|įrašas grąžintas/i)).toBeInTheDocument();
  },
};

export const DeletePending: Story = {
  parameters: withHandlers(getDeleteGoalMockHandler(pending)),
  play: async ({ canvas }) => {
    const deleteButtons = await canvas.findAllByRole("button", {
      name: /^(delete|ištrinti)(:|$)/i,
    });
    await userEvent.click(deleteButtons[0]!);
    const dialog = await openedDialog("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: /delete|ištrinti/i }));
  },
};
