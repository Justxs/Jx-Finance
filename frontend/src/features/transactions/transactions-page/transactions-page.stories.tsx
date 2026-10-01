import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, screen, userEvent, waitFor, within } from "storybook/test";
import { getCreateTransactionGroupMockHandler } from "@/api/generated/transaction-groups/transaction-groups.msw";
import {
  getBulkDeleteTransactionsMockHandler,
  getBulkMoveTransactionsMockHandler,
  getCreateTransactionMockHandler,
  getKeepPossibleDuplicatesMockHandler,
  getLedgerMockHandler,
} from "@/api/generated/transactions/transactions.msw";
import { getRestoreTransactionsMockHandler } from "@/api/generated/trash/trash.msw";
import { savedFilters, transactionTemplates } from "@/features/transactions/transaction-views";
import { withPageFrame } from "@/storybook/decorators";
import {
  ids,
  ledgerItemsOf,
  possibleDuplicatePair,
  savingsAccount,
  splitTransaction,
  transactionGroups,
} from "@/storybook/fixtures";
import {
  emptyHandlers,
  errorHandlers,
  loadingHandlers,
  pending,
  withHandlers,
} from "@/storybook/handlers";
import {
  type Canvas,
  chooseMenuItem,
  chooseOption,
  first,
  openedDialog,
} from "@/storybook/interactions";
import { TransactionsPage } from "./transactions-page";

const meta = {
  title: "Features/Transactions/TransactionsPage",
  component: TransactionsPage,
  parameters: { layout: "fullscreen", route: "/transactions" },
  decorators: [withPageFrame],
} satisfies Meta<typeof TransactionsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SecondPage: Story = { parameters: { route: "/transactions?page=2" } };

export const PastTheLastPage: Story = {
  parameters: { route: "/transactions?page=999" },
  play: async ({ canvas }) => {
    await expect(await canvas.findAllByRole("button", { name: /^Actions: / })).not.toHaveLength(0);
    await expect(canvas.getByRole("button", { name: "Next" })).toBeDisabled();
    await expect(canvas.getByRole("button", { name: "Previous" })).toBeEnabled();
  },
};

export const FilteredExpenses: Story = {
  parameters: { route: "/transactions?type=expense&sort=amount&direction=desc" },
};

export const FilteredByDateRange: Story = {
  parameters: { route: "/transactions?dateFrom=2026-09-01&dateTo=2026-09-07" },
};

export const NoSearchMatches: Story = {
  parameters: { route: "/transactions?search=does-not-exist" },
};

export const AddDialogFromUrl: Story = { parameters: { route: "/transactions?new=true" } };

export const SaveAndAddAnother: Story = {
  parameters: { route: "/transactions?new=true" },
  play: async () => {
    const dialog = within(await openedDialog());
    const amount = await dialog.findByLabelText("Amount");
    await fireEvent.change(amount, { target: { value: "12,50" } });
    await userEvent.click(dialog.getByRole("button", { name: "Save and add another" }));
    await waitFor(() => expect(amount).toHaveValue(""));
    await expect(screen.getByRole("dialog")).not.toHaveAttribute("data-closed");
    await waitFor(() => expect(amount).toHaveFocus());
  },
};

export const BulkSelection: Story = {
  play: async ({ canvas }) => {
    const boxes = await canvas.findAllByRole("checkbox", { name: /^Select: / });
    const enabled = boxes.filter((box) => box.getAttribute("aria-disabled") !== "true");
    await userEvent.click(enabled[0]!);
    await userEvent.click(enabled[1]!);
    await expect(enabled[1]).toHaveFocus();
    await expect(await canvas.findByText("2 selected")).toBeVisible();
  },
};

const grouped = fn();

export const GroupingTwoSelectedRows: Story = {
  parameters: withHandlers(
    getCreateTransactionGroupMockHandler(async ({ request }) => {
      grouped(await request.json());
      return first(transactionGroups);
    }),
  ),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findAllByRole("button", { name: "Show the 3 rows of Kelionė į Rygą" }),
    ).not.toHaveLength(0);
    const boxes = await canvas.findAllByRole("checkbox", { name: /^Select: / });
    const enabled = boxes.filter((box) => box.getAttribute("aria-disabled") !== "true");
    await userEvent.click(enabled[0]!);
    await userEvent.click(enabled[1]!);
    const toolbar = within(canvas.getByRole("group", { name: "Selected transactions" }));
    await userEvent.click(toolbar.getByRole("button", { name: "Group" }));

    const dialog = within(await openedDialog());
    await fireEvent.change(dialog.getByLabelText("Group name"), {
      target: { value: "Kelionė į Klaipėdą" },
    });
    await userEvent.click(dialog.getByRole("button", { name: "Group" }));

    await waitFor(() =>
      expect(grouped).toHaveBeenCalledWith({
        name: "Kelionė į Klaipėdą",
        transactionIds: [expect.any(String), expect.any(String)],
      }),
    );
    await waitFor(() => expect(canvas.queryByText("2 selected")).not.toBeInTheDocument());
  },
};

async function selectTwoRows(canvas: Canvas) {
  const boxes = await canvas.findAllByRole("checkbox", { name: /^Select: / });
  const enabled = boxes.filter((box) => box.getAttribute("aria-disabled") !== "true");
  await userEvent.click(enabled[0]!);
  await userEvent.click(enabled[1]!);
  return within(canvas.getByRole("group", { name: "Selected transactions" }));
}

export const MovingSelectedRowsWithARefusal: Story = {
  parameters: withHandlers(
    getBulkMoveTransactionsMockHandler({
      moved: 1,
      refused: [
        {
          transactionId: ids.transactions.maxima,
          code: "transaction.conversionFee",
          reason: "This is the fee of a currency conversion.",
        },
      ],
    }),
  ),
  play: async ({ canvas }) => {
    const toolbar = await selectTwoRows(canvas);
    await userEvent.click(toolbar.getByRole("button", { name: "Move to account" }));
    const popover = within(await screen.findByRole("dialog", { name: "Move to account" }));
    await chooseOption(
      popover.getByRole("combobox", { name: "Account to move to" }),
      savingsAccount.name,
    );
    await userEvent.click(popover.getByRole("button", { name: "Move" }));

    await expect(
      await screen.findByText(`Moved 1 of 2 transactions to ${savingsAccount.name}`),
    ).toBeVisible();
    await expect(
      screen.getByText("The fee of a currency conversion stays on the conversion's account."),
    ).toBeVisible();
    await waitFor(() => expect(canvas.queryByText("2 selected")).not.toBeInTheDocument());
  },
};

const deletedIds = fn();

export const DeletingSelectedRowsAndUndoingWithARefusal: Story = {
  parameters: withHandlers(
    getBulkDeleteTransactionsMockHandler(async ({ request }) => {
      deletedIds(await request.json());
      return { deleted: 2 };
    }),
    getRestoreTransactionsMockHandler({
      restored: 1,
      refused: [
        {
          transactionId: ids.transactions.maxima,
          code: "restore.referenceMissing",
          reason: "The account this belonged to is archived.",
        },
      ],
    }),
  ),
  play: async ({ canvas }) => {
    const toolbar = await selectTwoRows(canvas);
    await userEvent.click(toolbar.getByRole("button", { name: "Delete" }));
    const confirm = within(await openedDialog("alertdialog"));
    await expect(confirm.getByText("Delete 2 transactions?")).toBeVisible();
    await userEvent.click(confirm.getByRole("button", { name: "Delete" }));

    await waitFor(() =>
      expect(deletedIds).toHaveBeenCalledWith({
        transactionIds: [expect.any(String), expect.any(String)],
      }),
    );
    await expect(await screen.findByText("2 transactions deleted")).toBeVisible();
    await waitFor(() => expect(canvas.queryByText("2 selected")).not.toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Undo" }));

    await expect(await screen.findByText("Brought back 1 of 2 transactions")).toBeVisible();
    await expect(
      screen.getByText("The account or category this entry needs is gone. Restore that first."),
    ).toBeVisible();
  },
};

export const SavingAndApplyingAFilter: Story = {
  parameters: { route: "/transactions?type=expense&search=lidl" },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: /^Saved filters/ }));
    await userEvent.type(
      await screen.findByRole("textbox", { name: "Save filter" }),
      "Lidl expenses",
    );
    await userEvent.click(screen.getByRole("button", { name: "Save filter" }));
    await waitFor(() => expect(savedFilters.read()).toHaveLength(1));
    await expect(savedFilters.read()[0]?.filter).toEqual(
      expect.objectContaining({ search: "lidl", type: "expense" }),
    );

    const active = await canvas.findByRole("list", { name: "Active filters" });
    await userEvent.click(within(active).getByRole("button", { name: "Clear filters" }));
    await waitFor(() =>
      expect(canvas.queryByRole("list", { name: "Active filters" })).not.toBeInTheDocument(),
    );

    await userEvent.click(await canvas.findByRole("button", { name: /^Saved filters/ }));
    await userEvent.click(
      await screen.findByRole("button", { name: "Apply saved filter: Lidl expenses" }),
    );

    await waitFor(() => expect(canvas.getByRole("list", { name: "Active filters" })).toBeVisible());
  },
};

export const RemovingOneActiveFilter: Story = {
  parameters: { route: "/transactions?type=expense&search=lidl" },
  play: async ({ canvas }) => {
    const active = await canvas.findByRole("list", { name: "Active filters" });
    await expect(within(active).getByText("“lidl”")).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: "Filter by Description (now: lidl)" }),
    ).toBeInTheDocument();
    await userEvent.click(
      within(active).getByRole("button", { name: "Remove filter Type: Expense" }),
    );
    await waitFor(() => expect(within(active).queryByText("Expense")).not.toBeInTheDocument());
    await expect(within(active).getByText("“lidl”")).toBeVisible();
  },
};

export const SavedFilterNamingADeletedCategory: Story = {
  beforeEach: () => {
    savedFilters.save("Renovation", {
      filter: { categoryId: "44444444-0000-4000-8000-000000000099" },
    });
  },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: /^Saved filters/ }));
    await expect(await screen.findByText("Names something that no longer exists")).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: "Apply saved filter: Renovation" }));

    await waitFor(() => expect(canvas.getByRole("list", { name: "Active filters" })).toBeVisible());
    await expect(canvas.getAllByRole("table")[0]).toBeVisible();
  },
};

const keptPair = fn();

export const KeepingBothPossibleDuplicates: Story = {
  parameters: {
    route: "/transactions?duplicates=true",
    ...withHandlers(
      getLedgerMockHandler({
        items: ledgerItemsOf(possibleDuplicatePair),
        page: 1,
        pageSize: 25,
        total: possibleDuplicatePair.length,
      }),
      getKeepPossibleDuplicatesMockHandler(({ params }) => {
        keptPair(params.id);
      }),
    ),
  },
  play: async ({ canvas }) => {
    const active = await canvas.findByRole("list", { name: "Active filters" });
    await expect(within(active).getByText("Possible duplicates only")).toBeVisible();
    const actions = await canvas.findAllByRole("button", {
      name: `Actions: ${first(possibleDuplicatePair).description ?? ""}`,
    });
    await chooseMenuItem(first(actions), "Keep both");

    await waitFor(() => expect(keptPair).toHaveBeenCalledWith(first(possibleDuplicatePair).id));
    await expect(
      await screen.findByText("Kept both. This pair will not be offered again."),
    ).toBeVisible();
  },
};

export const DuplicatingASplitRow: Story = {
  play: async ({ canvas }) => {
    const actions = await canvas.findAllByRole("button", {
      name: `Actions: ${splitTransaction.description ?? ""}`,
    });
    await chooseMenuItem(first(actions), "Duplicate");

    const dialog = within(await openedDialog());
    const amounts = await dialog.findAllByLabelText("Amount");
    await expect(amounts[0]).toHaveValue("128.40");
    await expect(amounts).toHaveLength(4);
    await expect(dialog.getByRole("checkbox", { name: "Split into categories" })).toBeChecked();
    await expect(dialog.getByRole("checkbox", { name: "Buto remontas" })).toBeChecked();
  },
};

export const CreatingFromATemplate: Story = {
  beforeEach: () => {
    transactionTemplates.save("Weekly shop", {
      values: {
        accountId: ids.accounts.shared,
        categoryId: ids.categories.food,
        type: "expense",
        amount: "42.18",
        currency: "eur",
        description: "Maxima",
        tagIds: [ids.tags.car],
        lines: null,
      },
    });
  },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: /^Templates/ }));
    await userEvent.click(
      await screen.findByRole("button", { name: "New transaction from template: Weekly shop" }),
    );

    const dialog = within(await openedDialog());
    await expect(await dialog.findByLabelText("Amount")).toHaveValue("42.18");
    await expect(dialog.getByLabelText("Description")).toHaveValue("Maxima");
    await expect(dialog.getByRole("checkbox", { name: "Automobilis" })).toBeChecked();
  },
};

export const SavingATemplateFromTheForm: Story = {
  parameters: { route: "/transactions?new=true" },
  play: async () => {
    const dialog = within(await openedDialog());

    await fireEvent.change(await dialog.findByLabelText("Amount"), { target: { value: "42,18" } });
    await userEvent.click(dialog.getByRole("button", { name: "Save as template" }));
    await userEvent.type(await dialog.findByLabelText("Template name"), "Weekly shop");
    await userEvent.click(dialog.getByRole("button", { name: "Save template" }));

    await waitFor(() =>
      expect(transactionTemplates.read().map((row) => row.name)).toEqual(["Weekly shop"]),
    );
    await expect(transactionTemplates.read()[0]?.values.amount).toBe("42.18");
  },
};

export const TemplateStillValidates: Story = {
  beforeEach: () => {
    transactionTemplates.save("Empty shape", {
      values: {
        accountId: ids.accounts.shared,
        categoryId: null,
        type: "expense",
        amount: "",
        currency: "eur",
        description: null,
        tagIds: [],
        lines: null,
      },
    });
  },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: /^Templates/ }));
    await userEvent.click(
      await screen.findByRole("button", { name: "New transaction from template: Empty shape" }),
    );

    const dialog = within(await openedDialog());
    const amount = await dialog.findByLabelText("Amount");
    await expect(amount).toHaveValue("");

    await fireEvent.change(amount, { target: { value: "0" } });
    await waitFor(() => expect(dialog.getByRole("button", { name: "Add" })).toBeDisabled());

    await fireEvent.change(amount, { target: { value: "12,50" } });
    await waitFor(() => expect(dialog.getByRole("button", { name: "Add" })).toBeEnabled());
  },
};

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const CreatePending: Story = {
  parameters: withHandlers(getCreateTransactionMockHandler(pending)),
};
