import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import {
  getBudgetSuggestionsMockHandler,
  getDeleteBudgetMockHandler,
  getBudgetsMockHandler,
} from "@/api/generated/budgets/budgets.msw";
import { withPageFrame } from "@/storybook/decorators";
import {
  budgets,
  ids,
  overLimitBudget,
  many,
  serverErrorProblem,
  weeklyRolloverBudget,
} from "@/storybook/fixtures";
import {
  emptyHandlers,
  errorHandlers,
  failWith,
  loadingHandlers,
  pending,
  withHandlers,
} from "@/storybook/handlers";
import { openedDialog } from "@/storybook/interactions";
import { BudgetsPage } from "./budgets-page";

const manyBudgets = many(budgets, 14).map((item, index) => ({
  ...item,
  categoryName:
    index % 3 === 0
      ? `Household goods, repairs, garden maintenance and everything else that never fits anywhere ${index + 1}`
      : `Category ${index + 1}`,
}));

const meta = {
  title: "Features/Budgets/BudgetsPage",
  component: BudgetsPage,
  parameters: { layout: "fullscreen", route: "/budgets" },
  decorators: [withPageFrame],
} satisfies Meta<typeof BudgetsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const lead = await canvas.findByText("1 of 5 budgets over");
    await expect(lead.nextElementSibling).toHaveTextContent("€54.11");
    await expect(lead.nextElementSibling).toHaveClass("text-expense");
    await expect(lead.parentElement).toHaveTextContent(/Maistas$/u);
    await expect(canvas.getAllByText(/^Left this /u).map((label) => label.textContent)).toEqual([
      "Left this week",
      "Left this month",
      "Left this quarter",
      "Left this year",
    ]);
    await expect(canvas.getByText("Left this month").parentElement).toHaveTextContent(
      /spent of €210\.00$/u,
    );
    const ledgerLink = canvas
      .getAllByRole("link")
      .find((link) => link.getAttribute("href")?.startsWith("/transactions"));
    await expect(ledgerLink).toHaveAttribute(
      "href",
      expect.stringMatching(/\/transactions\?.*categoryId=.*type=expense.*dateFrom=/),
    );
    await expect(canvas.getByText(/weekly|savaitinis/i)).toBeVisible();
    await expect(canvas.getByText(/carried|perkelta/i)).toBeVisible();
  },
};

export const Empty: Story = {
  parameters: { msw: { handlers: emptyHandlers } },
  play: async ({ canvas }) => {
    await canvas.findByText(/no budgets yet|biudžetų dar nėra/i);
    await expect(canvas.queryByText(/^Left this/u)).toBeNull();
  },
};

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const SuggestionsFail: Story = {
  parameters: withHandlers(getBudgetSuggestionsMockHandler(failWith(serverErrorProblem))),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "Steady spending without a budget could not be loaded.",
    );
    await expect(canvas.getByText("Left this month")).toBeVisible();
  },
};

export const AllOverLimit: Story = {
  parameters: withHandlers(
    getBudgetsMockHandler([
      overLimitBudget,
      {
        ...overLimitBudget,
        id: ids.budgets.transport,
        name: "Transportas",
        limitAmount: "10.00",
        effectiveLimit: "10.00",
        spent: "98.40",
        remaining: "-88.40",
      },
    ]),
  ),
  play: async ({ canvas }) => {
    const label = await canvas.findByText("2 of 2 budgets over");
    await expect(label.nextElementSibling).toHaveClass("text-expense");
    await expect(label.nextElementSibling).toHaveTextContent("€142.51");
    await expect(canvas.getByText("Left this month").nextElementSibling).toHaveTextContent("€0.00");
    const rowFigure = canvas.getByText(/88\.40 over$/u);
    await expect(rowFigure).toHaveClass("text-expense");
    await expect(canvas.getByText(/98\.40 spent of .*10\.00/u)).toBeVisible();
  },
};

export const NoneOver: Story = {
  parameters: withHandlers(
    getBudgetsMockHandler(budgets.filter((budget) => budget !== overLimitBudget)),
  ),
  play: async ({ canvas }) => {
    const lead = await canvas.findByText("Left this month");
    await expect(lead.nextElementSibling).toHaveClass("font-serif");
    await expect(canvas.queryByText(/budgets? over/u)).toBeNull();
  },
};

export const ZeroLimit: Story = {
  parameters: withHandlers(
    getBudgetsMockHandler([
      {
        ...overLimitBudget,
        limitAmount: "0.00",
        effectiveLimit: "0.00",
        spent: "0.00",
        remaining: "0.00",
      },
    ]),
  ),
};

export const NegativeCarry: Story = {
  parameters: withHandlers(
    getBudgetsMockHandler([
      {
        ...weeklyRolloverBudget,
        carriedAmount: "-18.00",
        effectiveLimit: "22.00",
        spent: "30.00",
        remaining: "-8.00",
      },
    ]),
  ),
  play: async ({ canvas }) => {
    const carry = await canvas.findByText(/carried|perkelta/i);
    await expect(carry).toHaveTextContent(/−\D*18[.,]00/u);
  },
};

export const LongList: Story = {
  parameters: withHandlers(getBudgetsMockHandler(manyBudgets)),
};

export const AddDialogOpen: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: /add budget|pridėti/i }));
    await openedDialog();
  },
};

export const EditDialogOpen: Story = {
  play: async ({ canvas }) => {
    const editButtons = await canvas.findAllByRole("button", { name: /^(edit|redaguoti):/i });
    await userEvent.click(editButtons[0]!);
    const dialog = await openedDialog();
    await expect(dialog).toHaveAccessibleName(`Edit budget: ${budgets[0]!.name}`);
  },
};

export const DeletePending: Story = {
  parameters: withHandlers(getDeleteBudgetMockHandler(pending)),
  play: async ({ canvas }) => {
    const deleteButtons = await canvas.findAllByRole("button", { name: /^(delete|ištrinti):/i });
    await userEvent.click(deleteButtons[0]!);
    const dialog = await openedDialog("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: /delete|ištrinti/i }));
  },
};
