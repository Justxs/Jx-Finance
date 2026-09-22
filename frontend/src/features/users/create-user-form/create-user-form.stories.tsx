import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { getCreateUserMockHandler } from "@/api/generated/users/users.msw";
import { Modal } from "@/components/modal";
import { Card } from "@/components/ui/card/card";
import { validationProblem } from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { CreateUserForm } from "./create-user-form";

const meta = {
  title: "Features/Users/CreateUserForm",
  component: CreateUserForm,
  args: { onCreated: fn(), onCancel: fn() },
  render: (args) => (
    <Card className="w-[36rem] max-w-full p-6">
      <CreateUserForm {...args} />
    </Card>
  ),
} satisfies Meta<typeof CreateUserForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Narrow: Story = {
  render: (args) => (
    <Card className="w-72 p-4">
      <CreateUserForm {...args} />
    </Card>
  ),
};

export const InModal: Story = {
  render: (args) => (
    <Modal open onOpenChange={args.onCancel} title="Add user">
      <CreateUserForm {...args} />
    </Modal>
  ),
};

export const ValidationErrorAfterSubmit: Story = {
  parameters: withHandlers(
    getCreateUserMockHandler(
      failWith({ ...validationProblem, detail: "A user with this email already exists." }, 400),
    ),
  ),
};

export const PendingAfterSubmit: Story = {
  parameters: withHandlers(getCreateUserMockHandler(pending)),
};
