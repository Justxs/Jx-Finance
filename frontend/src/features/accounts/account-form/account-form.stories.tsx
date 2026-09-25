import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { getUpdateAccountMockHandler } from "@/api/generated/accounts/accounts.msw";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { checkingAccount, sharedAccount } from "@/storybook/fixtures";
import {
  emptyHandlers,
  errorHandlers,
  loadingHandlers,
  pending,
  withHandlers,
} from "@/storybook/handlers";
import { AccountForm } from "./account-form";

const meta = {
  title: "Features/Accounts/AccountForm",
  component: AccountForm,
  args: { onClose: fn() },
  render: (args) => (
    <div className="w-[min(36rem,90vw)]">
      <QueryBoundary fallback={<Skeleton className="h-72 w-full" />}>
        <AccountForm {...args} />
      </QueryBoundary>
    </div>
  ),
} satisfies Meta<typeof AccountForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const EditPersonal: Story = { args: { initial: checkingAccount } };

export const EditShared: Story = { args: { initial: sharedAccount } };

export const SavesChanges: Story = {
  args: { initial: checkingAccount },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Save" }));
    await waitFor(() => expect(args.onClose).toHaveBeenCalled());
  },
};

export const Pending: Story = {
  args: { initial: checkingAccount },
  parameters: withHandlers(getUpdateAccountMockHandler(pending)),
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const save = await canvas.findByRole("button", { name: "Save" });
    await userEvent.click(save);
    await waitFor(() => expect(save).toHaveAttribute("aria-busy", "true"));
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};

export const LongContent: Story = {
  args: {
    initial: {
      ...checkingAccount,
      name: "Everyday current account used for salary, groceries, subscriptions and all card payments",
      description:
        "Primary account. Salary lands here on the 10th, standing orders leave on the 11th, and everything left over at the end of the month is swept into savings. ".repeat(
          3,
        ),
    },
  },
};

export const NoHouseholds: Story = {
  args: { initial: sharedAccount },
  parameters: { msw: { handlers: emptyHandlers } },
};

export const ValidationErrors: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const buttons = await canvas.findAllByRole("button");
    const submit = buttons.find((button) => button.getAttribute("type") === "submit");
    if (submit) {
      await userEvent.click(submit);
    }
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };
