import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, userEvent, waitFor } from "storybook/test";
import {
  getCreateTransactionGroupMockHandler,
  getTransactionGroupsMockHandler,
} from "@/api/generated/transaction-groups/transaction-groups.msw";
import { withWidth } from "@/storybook/decorators";
import {
  familyHousehold,
  ids,
  memberTakenProblem,
  referenceNotSharedProblem,
  transactionGroups,
  transactions,
  tripGroup,
} from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { chooseOption, first } from "@/storybook/interactions";
import { GroupForm } from "./group-dialog";

const created = fn();

const meta = {
  title: "Features/Transactions/GroupDialog",
  component: GroupForm,
  args: {
    target: {
      kind: "selection",
      transactionIds: transactions.slice(0, 3).map((item) => item.id),
    },
    onClose: fn(),
    onGrouped: fn(),
  },
  decorators: [withWidth("dialog")],
} satisfies Meta<typeof GroupForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FromTheSelection: Story = {
  parameters: withHandlers(
    getCreateTransactionGroupMockHandler(async ({ request }) => {
      created(await request.json());
      return first(transactionGroups);
    }),
  ),
  play: async ({ canvas, args }) => {
    await expect(canvas.queryByRole("radiogroup")).toBeNull();
    await fireEvent.change(canvas.getByLabelText("Group name"), {
      target: { value: "Kelionė į Rygą" },
    });
    await userEvent.click(canvas.getByRole("button", { name: "Group" }));
    await waitFor(() =>
      expect(created).toHaveBeenCalledWith({
        name: "Kelionė į Rygą",
        transactionIds: transactions.slice(0, 3).map((item) => item.id),
        scope: "personal",
        householdId: null,
      }),
    );
    await waitFor(() => expect(args.onGrouped).toHaveBeenCalled());
  },
};

export const FromARowWithGroups: Story = {
  args: { target: { kind: "row", transactionId: ids.transactions.uncategorised } },
  play: async ({ canvas }) => {
    const existing = await canvas.findByRole("radio", { name: "Existing group" });
    await userEvent.click(existing);
    await expect(await canvas.findByRole("combobox", { name: "Existing group" })).toBeVisible();
  },
};

export const FromARowWithNone: Story = {
  args: { target: { kind: "row", transactionId: ids.transactions.uncategorised } },
  parameters: withHandlers(getTransactionGroupsMockHandler([])),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/You have no groups yet/)).toBeVisible();
    await expect(canvas.queryByRole("radiogroup")).toBeNull();
    await expect(canvas.getByLabelText("Group name")).toBeVisible();
  },
};

export const Renaming: Story = {
  args: { target: { kind: "rename", group: tripGroup } },
};

export const SharingWithTheHousehold: Story = {
  parameters: withHandlers(
    getCreateTransactionGroupMockHandler(async ({ request }) => {
      created(await request.json());
      return first(transactionGroups);
    }),
  ),
  play: async ({ canvas }) => {
    await fireEvent.change(canvas.getByLabelText("Group name"), {
      target: { value: "Atostogos" },
    });
    await chooseOption(await canvas.findByRole("combobox", { name: "Visibility" }), "Shared");
    await chooseOption(
      await canvas.findByRole("combobox", { name: "Household" }),
      familyHousehold.name,
    );
    await userEvent.click(canvas.getByRole("button", { name: "Group" }));
    await waitFor(() =>
      expect(created).toHaveBeenCalledWith(
        expect.objectContaining({ scope: "shared", householdId: familyHousehold.id }),
      ),
    );
  },
};

export const RowOnAPersonalAccount: Story = {
  parameters: withHandlers(
    getCreateTransactionGroupMockHandler(failWith(referenceNotSharedProblem)),
  ),
  play: async ({ canvas, args }) => {
    await fireEvent.change(canvas.getByLabelText("Group name"), { target: { value: "Atostogos" } });
    await userEvent.click(canvas.getByRole("button", { name: "Group" }));
    await expect(await canvas.findByRole("alert")).toBeVisible();
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};

export const Pending: Story = {
  parameters: withHandlers(getCreateTransactionGroupMockHandler(pending)),
  play: async ({ canvas }) => {
    await fireEvent.change(canvas.getByLabelText("Group name"), { target: { value: "Remontas" } });
    await userEvent.click(canvas.getByRole("button", { name: "Group" }));
    await waitFor(() => expect(canvas.getByRole("button", { name: /Group/ })).toBeDisabled());
  },
};

export const MemberTaken: Story = {
  parameters: withHandlers(getCreateTransactionGroupMockHandler(failWith(memberTakenProblem))),
  play: async ({ canvas, args }) => {
    await fireEvent.change(canvas.getByLabelText("Group name"), { target: { value: "Remontas" } });
    await userEvent.click(canvas.getByRole("button", { name: "Group" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "A row is already in another group. Remove it from that group first.",
    );
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};
