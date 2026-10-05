import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, screen, userEvent, waitFor, within } from "storybook/test";
import type { MonthReviewResponse, TransactionResponse } from "@/api/generated/model";
import {
  getCloseMonthMockHandler,
  getMonthReviewMockHandler,
} from "@/api/generated/month-close/month-close.msw";
import { getRecurringBillsMockHandler } from "@/api/generated/recurring-bills/recurring-bills.msw";
import { getSettingsMockHandler } from "@/api/generated/settings/settings.msw";
import {
  getBulkCategorizeTransactionsMockHandler,
  getTransactionsMockHandler,
  getUncategorizedSuggestionsMockHandler,
} from "@/api/generated/transactions/transactions.msw";
import { withPageFrame } from "@/storybook/decorators";
import {
  MONTH_CLOSE_MONTH,
  closedMonthReview,
  ids,
  monthBillsDue,
  monthUncategorizedTransactions,
  openMonthReview,
  serverErrorProblem,
  settingsWith,
} from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { readBody } from "@/storybook/handlers/http";
import { monthOf, reviewOf } from "@/storybook/handlers/month-close";
import { chooseOption, openedDialog } from "@/storybook/interactions";
import { MonthPage } from "./month-page";

let review: MonthReviewResponse = openMonthReview;
let uncategorized: TransactionResponse[] = monthUncategorizedTransactions;

function resetMonth() {
  review = openMonthReview;
  uncategorized = monthUncategorizedTransactions;
}

function idsIn(value: unknown) {
  return Array.isArray(value) ? value.filter((id) => typeof id === "string") : [];
}

const pageHandlers = [
  getMonthReviewMockHandler(({ params }) => {
    const month = monthOf(params);
    return month === MONTH_CLOSE_MONTH ? review : reviewOf(month);
  }),
  getTransactionsMockHandler(() => ({
    items: uncategorized,
    page: 1,
    pageSize: 20,
    total: uncategorized.length,
  })),
  getBulkCategorizeTransactionsMockHandler(async ({ request }) => {
    const chosen = idsIn((await readBody(request)).transactionIds);
    uncategorized = uncategorized.filter((row) => !chosen.includes(row.id));
    review = {
      ...review,
      checklist: { ...review.checklist, uncategorized: uncategorized.length },
    };
    return { updated: chosen.length };
  }),
  getRecurringBillsMockHandler(monthBillsDue),
];

function monthHandlers(...extra: Parameters<typeof withHandlers>) {
  return withHandlers(...extra, ...pageHandlers);
}

const meta = {
  title: "Features/MonthClose/MonthPage",
  component: MonthPage,
  parameters: {
    layout: "fullscreen",
    route: "/reports/month?month=2026-08",
    ...monthHandlers(),
  },
  decorators: [withPageFrame],
  beforeEach: resetMonth,
} satisfies Meta<typeof MonthPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OpenMonthWithLines: Story = {
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("heading", { name: "August 2026 has ended" }),
    ).toBeVisible();
    await expect(canvas.getByRole("status")).toHaveTextContent("7 lines still open.");
    await expect(canvas.getByRole("link", { name: "Month" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(canvas.getByRole("link", { name: "Overview" })).toBeVisible();
    const statements = within(canvas.getByRole("region", { name: "Statements" }));
    await expect(statements.getByRole("button", { name: "Import" })).toBeVisible();
    await expect(statements.getByRole("button", { name: "Reconcile" })).toBeVisible();
    await expect(await canvas.findByRole("combobox", { name: /RIMI VILNIUS/ })).toBeInTheDocument();
    await expect(await canvas.findByText("Vilniaus vandenys")).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "The month" })).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Budgets" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Close August 2026" })).toBeEnabled();
  },
};

export const ResolvingALineUpdatesTheCount: Story = {
  play: async ({ canvas }) => {
    const bolt = await canvas.findByRole("combobox", { name: /BOLT OPERATIONS/ });
    await chooseOption(bolt, "Transportas");
    await waitFor(() =>
      expect(canvas.queryByRole("combobox", { name: /BOLT OPERATIONS/ })).toBeNull(),
    );
    await waitFor(() =>
      expect(canvas.getByRole("status")).toHaveTextContent("6 lines still open."),
    );
  },
};

export const SettingOneCategoryForAll: Story = {
  play: async ({ canvas }) => {
    const bulk = await canvas.findByRole("combobox", { name: "Category for all shown" });
    await chooseOption(bulk, "Maistas");
    await userEvent.click(canvas.getByRole("button", { name: "Set category for all 3" }));
    await expect(await canvas.findByText("Every transaction has a category")).toBeVisible();
  },
};

export const LearnedSuggestionOnALine: Story = {
  parameters: monthHandlers(
    getSettingsMockHandler(settingsWith({ features: { learnedCategories: true } })),
    getUncategorizedSuggestionsMockHandler(() => [
      {
        transaction: uncategorized[0] ?? monthUncategorizedTransactions[0]!,
        categoryId: ids.categories.food,
        source: "learned",
        ruleName: null,
        confidence: 0.93,
      },
    ]),
  ),
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Suggested: Maistas" }));
    await waitFor(() =>
      expect(canvas.queryByRole("combobox", { name: /RIMI VILNIUS/ })).toBeNull(),
    );
  },
};

export const KeysMoveBetweenOpenLines: Story = {
  play: async ({ canvas }) => {
    await canvas.findByText("Vilniaus vandenys");
    await canvas.findByRole("combobox", { name: /BOLT OPERATIONS/ });
    await userEvent.keyboard("j");
    await expect(document.activeElement).toHaveTextContent(/Bendra šeimos sąskaita/);
    await userEvent.keyboard("jjjj");
    await expect(document.activeElement).toHaveTextContent("Vilniaus vandenys");
    await userEvent.keyboard("k");
    await expect(document.activeElement).toHaveTextContent(/BOLT OPERATIONS/);
    await userEvent.keyboard("j{Enter}");
    const dialog = await openedDialog();
    await expect(within(dialog).getByText("Confirm recurring entry")).toBeVisible();
  },
};

export const ClosingWithOpenLinesAsksFirst: Story = {
  parameters: monthHandlers(
    getCloseMonthMockHandler(() => {
      review = { ...closedMonthReview, note: "Fix the rest later" };
      return review;
    }),
  ),
  play: async ({ canvas }) => {
    await fireEvent.change(await canvas.findByLabelText("Note"), {
      target: { value: "Fix the rest later" },
    });
    await userEvent.click(canvas.getByRole("button", { name: "Close August 2026" }));
    const dialog = await openedDialog("alertdialog");
    await expect(within(dialog).getByText(/6 items still need attention/)).toBeVisible();
    await userEvent.click(within(dialog).getByRole("button", { name: "Close anyway" }));
    await expect(
      await canvas.findByRole("heading", { name: "August 2026 is closed" }),
    ).toBeVisible();
    const ruled = canvas.getByText("Net").closest(".border-double");
    await expect(ruled).toHaveTextContent("Fix the rest later");
  },
};

export const ClosedMonthIsRuledOff: Story = {
  beforeEach: () => {
    review = closedMonthReview;
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("status")).toHaveTextContent(/^Closed on /);
    await expect(canvas.queryByRole("heading", { name: "Statements" })).toBeNull();
    await expect(canvas.queryByRole("heading", { name: "Uncategorized" })).toBeNull();
    const net = canvas.getByText("Net");
    await expect(net.nextElementSibling).toHaveClass("font-serif");
    await expect(net.nextElementSibling).toHaveTextContent(/^\+/u);
    const ruled = net.closest(".border-double");
    await expect(ruled).toHaveClass("border-b-3");
    await expect(ruled).toHaveTextContent("Matched the Swedbank statement.");
    await expect(canvas.queryByRole("heading", { name: "Changed since the close" })).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: "Reopen" }));
    const dialog = await openedDialog("alertdialog");
    await expect(within(dialog).getByText(/The transactions stay as they are/)).toBeVisible();
  },
};

export const ClosedAndChangedShowsTheAmendment: Story = {
  parameters: { route: "/reports/month?month=2026-07" },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("heading", { name: "July 2026 changed after closing" }),
    ).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Changed since the close" })).toBeVisible();
    await expect(canvas.getByText("Moved to another month")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Re-close" }));
    const dialog = await openedDialog();
    await expect(within(dialog).getByText(/accepts the changes/)).toBeVisible();
  },
};

export const NotEnded: Story = {
  parameters: { route: "/reports/month?month=2026-09" },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("status")).toHaveTextContent(/once it has ended/);
    await expect(canvas.getByRole("button", { name: "Close September 2026" })).toBeDisabled();
    await expect(canvas.queryByLabelText("Note")).toBeNull();
    await expect(canvas.getByRole("button", { name: "Next month" })).toBeDisabled();
  },
};

export const DefaultsToTheLatestMonthLeftOpen: Story = {
  parameters: { route: "/reports/month" },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("heading", { name: "August 2026 has ended" }),
    ).toBeVisible();
  },
};

export const SwitchedOffFeaturesDropTheirLines: Story = {
  beforeEach: () => {
    review = {
      ...openMonthReview,
      checklist: { ...openMonthReview.checklist, unusual: null, unconfirmedRecurring: null },
    };
  },
  parameters: monthHandlers(
    getSettingsMockHandler(
      settingsWith({ features: { import: false, recurringBills: false, unusualAmounts: false } }),
    ),
  ),
  play: async ({ canvas }) => {
    await canvas.findByRole("heading", { name: "Statements" });
    await expect(canvas.queryByRole("button", { name: "Import statement" })).toBeNull();
    await expect(canvas.queryByRole("button", { name: "Import" })).toBeNull();
    await expect(canvas.queryByRole("heading", { name: "Recurring entries due" })).toBeNull();
    await expect(canvas.queryByText(/unusual/)).toBeNull();
    await expect(canvas.getByText("No possible duplicates")).toBeVisible();
  },
};

export const BillsDueButNoneListed: Story = {
  parameters: monthHandlers(getRecurringBillsMockHandler([])),
  play: async ({ canvas }) => {
    const bills = within(await canvas.findByRole("region", { name: "Recurring entries due" }));
    await expect(
      await bills.findByText("2 recurring entries due by the end of the month"),
    ).toBeVisible();
    await expect(bills.getByRole("link", { name: "Confirm" })).toHaveAttribute(
      "href",
      "/recurring-bills",
    );
  },
};

export const LithuanianLongNames: Story = {
  globals: { locale: "lt" },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("heading", { name: "Išrašai" })).toBeVisible();
    await expect(
      canvas.getByText(/Bendra šeimos sąskaita kasdienėms išlaidoms ir komunaliniams mokesčiams/),
    ).toBeVisible();
    await expect(await canvas.findByText(/vasaros stovyklą/)).toBeVisible();
    await expect(canvas.getByRole("status")).toHaveTextContent("Liko 7 neužbaigtos eilutės.");
  },
};

export const UncategorizedFailsToLoad: Story = {
  parameters: monthHandlers(getTransactionsMockHandler(failWith(serverErrorProblem))),
  play: async ({ canvas }) => {
    const section = await canvas.findByRole("region", { name: "Uncategorized 3" });
    await expect(await within(section).findByRole("alert")).toHaveTextContent(/Uncategorized/);
    await expect(screen.getByRole("heading", { name: "Statements" })).toBeVisible();
  },
};

export const Loading: Story = {
  parameters: monthHandlers(getMonthReviewMockHandler(pending)),
};
