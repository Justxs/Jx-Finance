import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import {
  getBudgetSuggestionsMockHandler,
  getCreateBudgetMockHandler,
} from "@/api/generated/budgets/budgets.msw";
import { budgetSuggestions, ids, overLimitBudget, serverErrorProblem } from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { readBody } from "@/storybook/handlers/http";
import { BudgetSuggestions } from "./budget-suggestions";

const created = fn();

const meta = {
  title: "Features/Budgets/BudgetSuggestions",
  component: BudgetSuggestions,
  parameters: { layout: "padded", route: "/budgets" },
} satisfies Meta<typeof BudgetSuggestions>;

export default meta;
type Story = StoryObj<typeof meta>;

const createButton = /^(create|sukurti) /i;

export const Default: Story = {
  play: async ({ canvas }) => {
    await canvas.findByText(/steady spending without a budget|pastovios išlaidos be biudžeto/i);
    const links = canvas.getAllByRole("link");
    await expect(links.map((link) => link.textContent)).toEqual([
      "Būstas",
      "Transportas",
      "Ryšiai ir internetas",
    ]);
    await expect(links[0]).toHaveAttribute(
      "href",
      expect.stringMatching(/categoryId=.*dateFrom=2026-03-01.*dateTo=2026-08-31/),
    );
    await expect(canvas.getByText("about €83.00 a month")).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: "Create €30.00 monthly budget" }),
    ).toBeEnabled();
    await expect(canvas.queryByText("Maistas")).toBeNull();
    await expect(canvas.queryByText("Kavinės ir restoranai")).toBeNull();
  },
};

export const Lithuanian: Story = { globals: { locale: "lt" } };

export const Create: Story = {
  parameters: withHandlers(
    getCreateBudgetMockHandler(async ({ request }) => {
      created(await readBody(request));
      return overLimitBudget;
    }),
  ),
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("button", { name: "Create €83.00 monthly budget" }),
    );
    await waitFor(() =>
      expect(created).toHaveBeenCalledWith({
        categoryId: ids.categories.transport,
        limitAmount: "83.00",
        period: "monthly",
        rolloverEnabled: false,
      }),
    );
  },
};

export const None: Story = {
  parameters: withHandlers(
    getBudgetSuggestionsMockHandler({
      period: "monthly",
      categories: budgetSuggestions.categories.map((item) => ({ ...item, hasBudget: true })),
    }),
  ),
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelector("h2")).toBeNull());
    await expect(canvasElement.querySelectorAll("button")).toHaveLength(0);
  },
};

export const CreatePending: Story = {
  parameters: withHandlers(getCreateBudgetMockHandler(pending)),
  play: async ({ canvas }) => {
    const buttons = await canvas.findAllByRole("button", { name: createButton });
    await userEvent.click(buttons[1]!);
    await waitFor(() => expect(buttons[1]).toHaveAttribute("aria-busy", "true"));
    await expect(buttons[0]).toBeDisabled();
    await expect(buttons[0]).not.toHaveAttribute("aria-busy");
  },
};

export const CreateFails: Story = {
  parameters: withHandlers(getCreateBudgetMockHandler(failWith(serverErrorProblem))),
  play: async ({ canvas }) => {
    const buttons = await canvas.findAllByRole("button", { name: createButton });
    await userEvent.click(buttons[0]!);
    await waitFor(() => expect(buttons[1]).toBeEnabled());
    await expect(canvas.getAllByRole("button", { name: createButton })).toHaveLength(3);
  },
};
