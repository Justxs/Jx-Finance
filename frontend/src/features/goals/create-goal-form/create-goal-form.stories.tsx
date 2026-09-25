import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, userEvent, waitFor, within } from "storybook/test";
import { getCreateGoalMockHandler } from "@/api/generated/goals/goals.msw";
import { withWidth } from "@/storybook/decorators";
import { accounts, sharedFundedGoal, unavailableFundedGoal } from "@/storybook/fixtures";
import { pending, withHandlers } from "@/storybook/handlers";
import { chooseOption } from "@/storybook/interactions";
import { CreateGoalForm } from "./create-goal-form";

const meta = {
  title: "Features/Goals/CreateGoalForm",
  component: CreateGoalForm,
  args: { accounts, onClose: fn() },
  decorators: [withWidth("form")],
} satisfies Meta<typeof CreateGoalForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filled: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [name, target, current] = canvas.getAllByRole("textbox");
    await userEvent.type(name!, "Summer holiday in Madeira for the whole family");
    await userEvent.type(target!, "3200.00");
    await userEvent.type(current!, "1875.50");
  },
};

export const ValidationErrors: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [name, target, current] = canvas.getAllByRole("textbox");
    await userEvent.type(name!, "x");
    await userEvent.clear(name!);
    await userEvent.type(target!, "0");
    await userEvent.type(current!, "abc");
  },
};

export const FundedFromAccount: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await chooseOption(
      canvas.getByRole("combobox", { name: /progress comes from|pažanga/i }),
      /an account balance|sąskaitos likučio/i,
    );

    await expect(
      await canvas.findByRole("combobox", { name: /funding account|finansuojanti/i }),
    ).toBeVisible();
    await expect(canvas.queryByLabelText(/current amount|dabartinė suma/i)).toBeNull();
    await expect(canvas.getByLabelText(/share of the balance|likučio dalis/i)).toHaveValue(100);
  },
};

export const FundingAccountMissing: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const [name, target] = canvas.getAllByRole("textbox");
    await fireEvent.change(name!, { target: { value: "House deposit" } });
    await fireEvent.change(target!, { target: { value: "25000" } });
    await chooseOption(
      canvas.getByRole("combobox", { name: /progress comes from|pažanga/i }),
      /an account balance|sąskaitos likučio/i,
    );
    await userEvent.click(canvas.getByRole("button", { name: /add goal|pridėti tikslą/i }));

    await expect(await canvas.findByText(/this field is required|privalomas/i)).toBeVisible();
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};

export const NoAccounts: Story = {
  args: { accounts: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await chooseOption(
      canvas.getByRole("combobox", { name: /progress comes from|pažanga/i }),
      /an account balance|sąskaitos likučio/i,
    );

    await expect(await canvas.findByText(/add an account first|pirma sukurkite/i)).toBeVisible();
  },
};

export const EditFundedGoal: Story = {
  args: { initial: sharedFundedGoal },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText(/share of the balance|likučio dalis/i)).toHaveValue(40);
    await expect(canvas.queryByLabelText(/current amount|dabartinė suma/i)).toBeNull();
  },
};

export const EditGoalWithUnavailableAccount: Story = {
  args: { initial: unavailableFundedGoal },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("combobox", { name: /funding account|finansuojanti/i }),
    ).toHaveTextContent(/unavailable account|nepasiekiama sąskaita/i);
  },
};

export const BackToManualKeepsTheStoredAmount: Story = {
  args: { initial: sharedFundedGoal },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await chooseOption(
      canvas.getByRole("combobox", { name: /progress comes from|pažanga/i }),
      /an amount i type|mano įvedamos/i,
    );

    await waitFor(async () =>
      expect(await canvas.findByLabelText(/current amount|dabartinė suma/i)).toHaveValue("450.00"),
    );
  },
};

export const SubmitPending: Story = {
  parameters: withHandlers(getCreateGoalMockHandler(pending)),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [name, target] = canvas.getAllByRole("textbox");
    await fireEvent.change(name!, { target: { value: "New bicycle" } });
    await fireEvent.change(target!, { target: { value: "900" } });
    await userEvent.click(canvas.getByRole("button", { name: /add goal|pridėti tikslą/i }));
  },
};
