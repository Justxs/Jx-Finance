import type { Meta, StoryObj } from "@storybook/react-vite";
import { HttpResponse, delay, http } from "msw";
import { fn } from "storybook/test";
import { Modal } from "@/components/modal";
import { validationProblem } from "@/storybook/fixtures";
import { handlers } from "@/storybook/handlers";
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
        http.post("*/api/users", () =>
          HttpResponse.json(
            { ...validationProblem, detail: "A user with this email already exists." },
            { status: 400, headers: { "Content-Type": "application/problem+json" } },
          ),
        ),
        ...handlers,
      ],
    },
  },
};

export const PendingAfterSubmit: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post("*/api/users", async () => {
          await delay("infinite");
          return new HttpResponse(null, { status: 204 });
        }),
        ...handlers,
      ],
    },
  },
};
