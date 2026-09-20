import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { getAddMemberMockHandler } from "@/api/generated/households/households.msw";
import { Modal } from "@/components/modal";
import { Card } from "@/components/ui/card/card";
import { familyHousehold, notFoundProblem } from "@/storybook/fixtures";
import { failWith, handlers, pending } from "@/storybook/handlers";
import { AddMemberForm } from "./add-member-form";

const meta = {
  title: "Features/Households/AddMemberForm",
  component: AddMemberForm,
  parameters: { route: "/households" },
  args: { householdId: familyHousehold.id ?? "", onAdded: fn(), onCancel: fn() },
  render: (args) => (
    <Card className="w-[36rem] max-w-full p-6">
      <AddMemberForm {...args} />
    </Card>
  ),
} satisfies Meta<typeof AddMemberForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutCancel: Story = { args: { onCancel: undefined } };

export const Narrow: Story = {
  render: (args) => (
    <Card className="w-72 p-4">
      <AddMemberForm {...args} />
    </Card>
  ),
};

export const InModal: Story = {
  render: (args) => (
    <Modal open onOpenChange={fn()} title="Add member">
      <AddMemberForm {...args} />
    </Modal>
  ),
};

export const UnknownEmailAfterSubmit: Story = {
  parameters: {
    msw: {
      handlers: [
        getAddMemberMockHandler(
          failWith({ ...notFoundProblem, detail: "No user with this email exists." }, 404),
        ),
        ...handlers,
      ],
    },
  },
};

export const PendingAfterSubmit: Story = {
  parameters: {
    msw: {
      handlers: [getAddMemberMockHandler(pending), ...handlers],
    },
  },
};
