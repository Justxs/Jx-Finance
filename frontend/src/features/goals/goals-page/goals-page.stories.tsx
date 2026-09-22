import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
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

export const WithUnavailableFunding: Story = {
  parameters: {
    msw: {
      handlers: [getGoalsMockHandler([...goals, unavailableFundedGoal]), ...handlers],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText(/progress unavailable|pažanga nepasiekiama/i),
    ).toBeVisible();
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

export const EditDialogOpen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      (await canvas.findAllByRole("button", { name: /^(edit|redaguoti):/i }))[0]!,
    );
    await openedDialog();
  },
};

export const EditInvalid: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      (await canvas.findAllByRole("button", { name: /^(edit|redaguoti):/i }))[0]!,
    );
    const dialog = within(await within(document.body).findByRole("dialog"));
    await userEvent.clear(dialog.getAllByRole("textbox")[0]!);
  },
};

export const EditSavePending: Story = {
  parameters: {
    msw: {
      handlers: [getUpdateGoalMockHandler(pending), ...handlers],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      (await canvas.findAllByRole("button", { name: /^(edit|redaguoti):/i }))[0]!,
    );
    const dialog = within(await within(document.body).findByRole("dialog"));
    await userEvent.click(dialog.getByRole("button", { name: /^(save|išsaugoti)$/i }));
  },
};

export const DeleteOffersUndo: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(document.body);
    await userEvent.click(
      (await canvas.findAllByRole("button", { name: /^(delete|ištrinti)(:|$)/i }))[0]!,
    );
    const dialog = await page.findByRole("alertdialog");
    await expect(
      within(dialog).getByText(/you can undo this straight away|veiksmą galėsite atšaukti/i),
    ).toBeVisible();
    await userEvent.click(within(dialog).getByRole("button", { name: /delete|ištrinti/i }));

    const undo = await page.findByRole("button", { name: /^(undo|atšaukti)$/i });
    await userEvent.click(undo);

    await expect(await page.findByText(/brought back|įrašas grąžintas/i)).toBeInTheDocument();
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
