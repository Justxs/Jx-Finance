import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import type { CategoryBreakdownItem, ReportSummaryResponse } from "@/api/generated/model";
import { fromCents, toCents } from "@/lib/money";
import { withWidth } from "@/storybook/decorators";
import { emptyReportSummary, reportSummaryMonth } from "@/storybook/fixtures";
import { MoneyFlow } from "./money-flow";

function category(
  categoryId: string,
  categoryName: string,
  amount: string,
  overrides: Partial<CategoryBreakdownItem> = {},
): CategoryBreakdownItem {
  return { categoryId, categoryName, categoryIcon: null, amount, ...overrides };
}

function summaryOf(
  income: CategoryBreakdownItem[],
  expense: CategoryBreakdownItem[],
): ReportSummaryResponse {
  const totalIncome = income.reduce((sum, item) => sum + toCents(item.amount), 0);
  const totalExpense = expense.reduce((sum, item) => sum + toCents(item.amount), 0);
  return {
    ...emptyReportSummary,
    totalIncome: fromCents(totalIncome),
    totalExpense: fromCents(totalExpense),
    net: fromCents(totalIncome - totalExpense),
    incomeByCategory: income,
    expenseByCategory: expense,
  };
}

const salary = [
  category("salary", "Atlyginimas", "3000.00"),
  category("side", "Papildomos pajamos", "200.00"),
];
const spending = [category("rent", "Būstas", "1100.00"), category("food", "Maistas", "812.33")];

const meta = {
  title: "Features/Reports/MoneyFlow",
  component: MoneyFlow,
  args: { summary: reportSummaryMonth },
  decorators: [withWidth("wide")],
} satisfies Meta<typeof MoneyFlow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { name: /^(money flow|pinigų srautas)$/i }),
    ).toBeVisible();
    await expect(canvas.getByRole("img", { name: /saved|sutaupyta/i })).toBeInTheDocument();
  },
};

export const DeficitMonth: Story = {
  args: { summary: summaryOf([category("salary", "Atlyginimas", "900.00")], spending) },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("img", {
        name: /^(€1,912\.33 in: €1,912\.33 spent in 2 categories, €0\.00 saved|Įplaukos 1\s912,33\s€.*)$/,
      }),
    ).toBeInTheDocument();
  },
};

export const ExpensesOnly: Story = { args: { summary: summaryOf([], spending) } };

export const MoneyBack: Story = {
  args: {
    summary: summaryOf(salary, [...spending, category("electronics", "Electronics", "-40.00")]),
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText(
        /^(Money back: Electronics €40\.00 \(more refunded than spent\)|Grąžinta: Electronics 40,00\s€ \(grąžinta daugiau, nei išleista\))$/,
      ),
    ).toBeVisible();
    await expect(
      canvas.getByRole("img", {
        name: /^(€3,240\.00 in: €1,912\.33 spent in 2 categories, €1,327\.67 saved|Įplaukos 3\s240,00\s€: išleista 1\s912,33\s€ \(2 kategorijos\), sutaupyta 1\s327,67\s€)$/,
      }),
    ).toBeInTheDocument();
  },
};

export const IncomeOnly: Story = { args: { summary: summaryOf(salary, []) } };

export const Empty: Story = {
  args: { summary: emptyReportSummary },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText(/nothing recorded in this period|šiuo laikotarpiu įrašų nėra/i),
    ).toBeVisible();
    await expect(canvas.queryByRole("img")).toBeNull();
  },
};

export const ChildCategoriesRolledUpUnderAGroup: Story = {
  args: {
    summary: summaryOf(salary, [
      category("fuel", "Degalai", "120.00", {
        parentId: "transport",
        parentName: "Transportas",
        parentIcon: "bus",
      }),
      category("parking", "Parkavimas", "15.00", {
        parentId: "transport",
        parentName: "Transportas",
        parentIcon: "bus",
      }),
      ...spending,
    ]),
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("img", { name: /(spent in 3 categories|\(3 kategorijos\))/ }),
    ).toBeInTheDocument();
  },
};
