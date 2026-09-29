import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { getCashFlowForecastMockHandler } from "@/api/generated/accounts/accounts.msw";
import { withWidth } from "@/storybook/decorators";
import {
  calmCashFlowForecast,
  emptyCashFlowForecast,
  otherCurrenciesCashFlowForecast,
  serverErrorProblem,
  usualSpendingCashFlowForecast,
} from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { chooseOption } from "@/storybook/interactions";
import { CashFlowForecast } from "./cash-flow-forecast";

const meta = {
  title: "Features/Accounts/CashFlowForecast",
  component: CashFlowForecast,
  decorators: [withWidth("wide")],
} satisfies Meta<typeof CashFlowForecast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AtRisk: Story = {
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText(/Swedbank einamoji goes below zero on Oct 1, after Buto nuoma/u),
    ).toBeVisible();
    await expect(canvas.queryByText(/With usual spending/u)).toBeNull();
    const table = canvas.getByRole("table", { name: /Entries of Swedbank einamoji/u });
    await expect(within(table).getByText("Overdue")).toBeVisible();
  },
};

export const OnlyWithUsualSpending: Story = {
  parameters: withHandlers(getCashFlowForecastMockHandler(usualSpendingCashFlowForecast)),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText(/With usual spending, .* may go below zero around Oct 1/u),
    ).toBeVisible();
    await expect(canvas.queryByText(/goes below zero on/u)).toBeNull();
    await expect(await canvas.findByText("With usual spending")).toBeVisible();
  },
};

export const NoneAtRisk: Story = {
  parameters: withHandlers(getCashFlowForecastMockHandler(calmCashFlowForecast)),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText("No account goes below zero in the next 90 days."),
    ).toBeVisible();
  },
};

export const VariableEstimated: Story = {
  play: async ({ canvas }) => {
    const table = await canvas.findByRole("table", { name: /Entries of Swedbank einamoji/u });
    const row = within(table).getAllByRole("row", { name: /Ignitis/u })[0];
    await expect(row).toHaveTextContent(/≈ Estimated −€61\.20/u);
  },
};

export const NotCounted: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByText("Not counted (2)"));
    await expect(canvas.getByText("Vilniaus vandenys")).toBeVisible();
    await expect(canvas.getByText("Variable amount with no history yet")).toBeVisible();
    await expect(canvas.getByText("No account")).toBeVisible();
  },
};

export const OtherCurrencies: Story = {
  parameters: withHandlers(getCashFlowForecastMockHandler(otherCurrenciesCashFlowForecast)),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText(/also holds other currencies; only its EUR balance is projected/u),
    ).toBeVisible();
  },
};

export const NoEntries: Story = {
  parameters: withHandlers(getCashFlowForecastMockHandler(emptyCashFlowForecast)),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText("Nothing is scheduled in the next 90 days."),
    ).toBeVisible();
  },
};

export const ChoosesAnAccount: Story = {
  play: async ({ canvas }) => {
    await chooseOption(
      await canvas.findByRole("combobox", { name: "Account" }),
      "Taupomoji sąskaita",
    );
    await expect(
      await canvas.findByRole("table", { name: /Entries of Taupomoji sąskaita/u }),
    ).toBeVisible();
  },
};

export const ChangesTheHorizon: Story = {
  play: async ({ canvas }) => {
    await chooseOption(await canvas.findByRole("combobox", { name: "Period" }), "30 days");
    await expect(await canvas.findByRole("heading", { name: "Next 30 days" })).toBeVisible();
  },
};

export const Loading: Story = {
  parameters: withHandlers(getCashFlowForecastMockHandler(pending)),
};

export const ServerError: Story = {
  parameters: withHandlers(getCashFlowForecastMockHandler(failWith(serverErrorProblem))),
};
