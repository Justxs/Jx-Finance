import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import {
  getDeleteBudgetMockHandler,
  getBudgetsMockHandler,
} from "@/api/generated/budgets/budgets.msw";
import { withPageFrame } from "@/storybook/decorators";
import { budgets, ids, overLimitBudget, many, weeklyRolloverBudget } from "@/storybook/fixtures";
import {
  emptyHandlers,
  errorHandlers,
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/spent in window|išleista lange/i)).toBeVisible();
    await expect(canvas.getByText(/^(budgeted|suplanuota)$/i)).toBeVisible();
    const links = canvas.getAllByRole("link");
    await expect(links[0]).toHaveAttribute(
      "href",
      expect.stringMatching(/\/transactions\?.*categoryId=.*type=expense.*dateFrom=/),
    );
    await expect(canvas.getByText(/weekly|savaitinis/i)).toBeVisible();
    await expect(canvas.getByText(/carried|perkelta/i)).toBeVisible();
  },
};

export const Empty: Story = {
  parameters: { msw: { handlers: emptyHandlers } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText(/no budgets yet|biudžetų dar nėra/i);
    await expect(canvas.queryByText(/spent in window|išleista lange/i)).toBeNull();
  },
};

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const AllOverLimit: Story = {
  parameters: withHandlers(
    getBudgetsMockHandler([
      overLimitBudget,
      {
        ...overLimitBudget,
        id: ids.budgets.transport,
        categoryName: "Transportas",
        limitAmount: "10.00",
        effectiveLimit: "10.00",
        spent: "98.40",
        remaining: "-88.40",
      },
    ]),
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const label = await canvas.findByText(/^(over by|viršyta)$/i);
    await expect(label.nextElementSibling).toHaveClass("text-expense");
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const carry = await canvas.findByText(/carried|perkelta/i);
    await expect(carry).toHaveTextContent(/−\D*18[.,]00/u);
  },
};

export const LongList: Story = {
  parameters: withHandlers(getBudgetsMockHandler(manyBudgets)),
};

export const AddDialogOpen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: /add budget|pridėti/i }));
    await openedDialog();
  },
};

export const EditDialogOpen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const editButtons = await canvas.findAllByRole("button", { name: /^(edit|redaguoti):/i });
    await userEvent.click(editButtons[0]!);
    await openedDialog();
  },
};

export const DeletePending: Story = {
  parameters: withHandlers(getDeleteBudgetMockHandler(pending)),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const deleteButtons = await canvas.findAllByRole("button", { name: /^(delete|ištrinti):/i });
    await userEvent.click(deleteButtons[0]!);
    const dialog = await within(document.body).findByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: /delete|ištrinti/i }));
  },
};
