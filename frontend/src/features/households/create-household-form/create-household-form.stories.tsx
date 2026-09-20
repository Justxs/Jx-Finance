import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { getCreateHouseholdMockHandler } from "@/api/generated/households/households.msw";
import { Modal } from "@/components/modal";
import { Card } from "@/components/ui/card";
import { serverErrorProblem } from "@/storybook/fixtures";
import { failWith, handlers, pending } from "@/storybook/handlers";
import { CreateHouseholdForm } from "./create-household-form";

const meta = {
  title: "Features/Households/CreateHouseholdForm",
  component: CreateHouseholdForm,
  parameters: { route: "/households" },
  args: { onCreated: fn(), onCancel: fn() },
  render: (args) => (
    <Card className="w-[28rem] max-w-full p-6">
      <CreateHouseholdForm {...args} />
    </Card>
  ),
} satisfies Meta<typeof CreateHouseholdForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Narrow: Story = {
  render: (args) => (
    <Card className="w-64 p-4">
      <CreateHouseholdForm {...args} />
    </Card>
  ),
};

export const InModal: Story = {
  render: (args) => (
    <Modal open onOpenChange={args.onCancel} title="Add household">
      <CreateHouseholdForm {...args} />
    </Modal>
  ),
};

export const ServerErrorAfterSubmit: Story = {
  parameters: {
    msw: {
      handlers: [
        getCreateHouseholdMockHandler(
          failWith({ ...serverErrorProblem, instance: "/api/households" }, 500),
        ),
        ...handlers,
      ],
    },
  },
};

export const PendingAfterSubmit: Story = {
  parameters: {
    msw: {
      handlers: [getCreateHouseholdMockHandler(pending), ...handlers],
    },
  },
};
