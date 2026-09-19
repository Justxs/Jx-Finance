import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { getCreateUserMockHandler } from "@/api/generated/users/users.msw";
import { Modal } from "@/components/modal";
import { validationProblem } from "@/storybook/fixtures";
import { failWith, handlers, pending } from "@/storybook/handlers";
import { CreateUserForm } from "./create-user-form";

const meta = {
  title: "Features/Users/CreateUserForm",
  component: CreateUserForm,
  args: { onCreated: fn(), onCancel: fn() },
  render: (args) => (
    <div className="card w-[36rem] max-w-full p-6">
      <CreateUserForm {...args} />
    </div>
  ),
} satisfies Meta<typeof CreateUserForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Narrow: Story = {
  render: (args) => (
    <div className="card w-72 p-4">
      <CreateUserForm {...args} />
    </div>
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
  parameters: {
    msw: {
      handlers: [
        getCreateUserMockHandler(
          failWith({ ...validationProblem, detail: "A user with this email already exists." }, 400),
        ),
        ...handlers,
      ],
    },
  },
};

export const PendingAfterSubmit: Story = {
  parameters: {
    msw: {
      handlers: [getCreateUserMockHandler(pending), ...handlers],
    },
  },
};
