import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, userEvent, waitFor } from "storybook/test";
import { getCreateSharedExpenseMockHandler } from "@/api/generated/households/households.msw";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Card } from "@/components/ui/card/card";
import {
  alreadySplitProblem,
  currentUser,
  memberUser,
  outdatedSharedPurchase,
  sharedPurchase,
} from "@/storybook/fixtures";
import { emptyHandlers, failWith, pending, withHandlers } from "@/storybook/handlers";
import { SplitExpenseForm } from "./split-expense-dialog";

const purchase = { ...sharedPurchase, sharedExpense: null };

const meta = {
  title: "Features/Households/SplitExpenseForm",
  component: SplitExpenseForm,
  parameters: { route: "/transactions" },
  args: { transaction: purchase, onClose: fn() },
  render: (args) => (
    <Card className="w-[36rem] max-w-full p-6">
      <QueryBoundary fallback={null}>
        <SplitExpenseForm {...args} />
      </QueryBoundary>
    </Card>
  ),
} satisfies Meta<typeof SplitExpenseForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvas }) => {
    await expect(await canvas.findByText(`${currentUser.displayName} pays €45.00`)).toBeVisible();
    await expect(canvas.getByText(`${memberUser.displayName} pays €45.00`)).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(args.onClose).toHaveBeenCalled());
  },
};

export const ByShares: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("radio", { name: "By shares" }));
    await fireEvent.change(
      canvas.getByRole("textbox", { name: `Shares of ${currentUser.displayName}` }),
      {
        target: { value: "2" },
      },
    );
    await expect(await canvas.findByText(`${currentUser.displayName} pays €60.00`)).toBeVisible();
    await expect(canvas.getByText(`${memberUser.displayName} pays €30.00`)).toBeVisible();
  },
};

export const ExactAmountsThatDoNotAddUp: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("radio", { name: "Exact amounts" }));
    await fireEvent.change(
      canvas.getByRole("textbox", { name: `Amount of ${currentUser.displayName}` }),
      {
        target: { value: "50" },
      },
    );
    await fireEvent.change(
      canvas.getByRole("textbox", { name: `Amount of ${memberUser.displayName}` }),
      {
        target: { value: "30" },
      },
    );
    await expect(
      await canvas.findByText("The amounts add up to €80.00, not €90.00."),
    ).toBeVisible();
  },
};

export const OnlyThePayer: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("checkbox", { name: `${memberUser.displayName} takes part` }),
    );
    await expect(canvas.queryByText(`${memberUser.displayName} pays €45.00`)).toBeNull();
    await expect(canvas.getByText(`${currentUser.displayName} pays €90.00`)).toBeVisible();
  },
};

export const UpdateAfterTheAmountChanged: Story = {
  args: { transaction: outdatedSharedPurchase },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(`${currentUser.displayName} pays €48.20`)).toBeVisible();
    await expect(canvas.getByRole("combobox", { name: "Household" })).toBeDisabled();
  },
};

export const AlreadySplit: Story = {
  parameters: withHandlers(getCreateSharedExpenseMockHandler(failWith(alreadySplitProblem))),
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Save" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "This expense is already split.",
    );
  },
};

export const Saving: Story = {
  parameters: withHandlers(getCreateSharedExpenseMockHandler(pending)),
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: /save/i })).toHaveAttribute("aria-busy", "true"),
    );
  },
};

export const NoHousehold: Story = {
  parameters: { msw: { handlers: emptyHandlers } },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Save" }));
    await expect(await canvas.findByText("Choose who takes part.")).toBeVisible();
  },
};

export const Lithuanian: Story = { globals: { locale: "lt" } };
