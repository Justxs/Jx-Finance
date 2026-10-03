import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";
import { withWidth } from "@/storybook/decorators";
import {
  accounts,
  categories,
  ids,
  savingsAccount,
  tags,
  transactions,
} from "@/storybook/fixtures";
import { chooseMenuItem, chooseOption, openedDialog } from "@/storybook/interactions";
import { SelectionToolbar } from "./selection-toolbar";

const expenses = transactions.filter((item) => item.type === "expense" && !item.isSplit);
const incomes = transactions.filter((item) => item.type === "income" && !item.isSplit);

const meta = {
  title: "Features/Transactions/SelectionToolbar",
  component: SelectionToolbar,
  args: {
    selected: expenses.slice(0, 3),
    categories,
    tags,
    accounts,
    pending: false,
    tagPending: false,
    movePending: false,
    deletePending: false,
    onApply: fn(),
    onApplyTags: fn(),
    onMove: fn(),
    onGroup: fn(),
    onDelete: fn(),
    onClear: fn(),
  },
  decorators: [withWidth("w-[min(56rem,92vw)]")],
} satisfies Meta<typeof SelectionToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OneType: Story = {};

export const IncomeOnly: Story = { args: { selected: incomes.slice(0, 1) } };

export const MixedTypes: Story = {
  args: { selected: [...expenses.slice(0, 2), ...incomes.slice(0, 1)] },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText(
        "The selection mixes income and expenses. Select rows of one type to set a category.",
      ),
    ).toHaveClass("line-clamp-2");
    await expect(canvas.queryByRole("button", { name: "Set category" })).toBeNull();
  },
};

export const Idle: Story = {
  args: { selected: [] },
  play: async ({ canvasElement }) => {
    const toolbar = canvasElement.querySelector("[data-slot=selection-toolbar]");
    await expect(toolbar).toHaveClass("invisible");
    await expect(toolbar).toHaveAttribute("aria-hidden", "true");
    await expect(toolbar).toHaveAttribute("inert");
  },
};

export const Pending: Story = { args: { pending: true } };

export const MovePending: Story = { args: { movePending: true } };

export const DeletePending: Story = {
  args: { deletePending: true },
  play: async ({ canvas }) => {
    const others = [/^Set category$/u, /^More$/u, /^Clear/u];
    await Promise.all(
      others.map((name) => expect(canvas.getByRole("button", { name })).toBeDisabled()),
    );
  },
};

export const Narrow: Story = {
  args: { selected: [...expenses.slice(0, 2), ...incomes.slice(0, 1)] },
  decorators: [withWidth("card")],
};

export const MovingToAnotherAccount: Story = {
  args: { selected: [...expenses.slice(0, 2), ...incomes.slice(0, 1)] },
  play: async ({ args, canvas }) => {
    await chooseMenuItem(canvas.getByRole("button", { name: "More" }), "Move to account");
    const popover = within(await openedDialog());
    await expect(popover.getByRole("heading", { name: "Move to account" })).toBeVisible();
    const move = popover.getByRole("button", { name: "Move" });
    await expect(move).toBeDisabled();

    await chooseOption(
      popover.getByRole("combobox", { name: "Account to move to" }),
      savingsAccount.name,
    );
    await userEvent.click(move);

    await waitFor(() => expect(args.onMove).toHaveBeenCalledWith(savingsAccount.id));
  },
};

export const DeletingTheSelection: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Delete" }));

    await expect(args.onDelete).toHaveBeenCalledOnce();
  },
};

export const SettingTags: Story = {
  play: async ({ args, canvas }) => {
    await chooseMenuItem(canvas.getByRole("button", { name: "More" }), "Set tags");
    const dialog = within(await openedDialog());
    await userEvent.click(dialog.getByRole("checkbox", { name: "Automobilis" }));
    await userEvent.click(dialog.getByRole("button", { name: "Set tags" }));

    await waitFor(() => expect(args.onApplyTags).toHaveBeenCalledWith([ids.tags.car]));
  },
};

export const GroupNeedsTwoRows: Story = {
  args: { selected: expenses.slice(0, 1) },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "More" }));
    await expect(await screen.findByRole("menuitem", { name: "Group" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  },
};
