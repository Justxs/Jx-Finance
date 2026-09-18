import type { Meta, StoryObj } from "@storybook/react-vite";
import { HttpResponse, delay, http } from "msw";
import { fn } from "storybook/test";
import { Modal } from "@/components/modal";
import { familyHousehold, notFoundProblem } from "@/storybook/fixtures";
import { handlers } from "@/storybook/handlers";
import { AddMemberForm } from "./add-member-form";

const meta = {
  title: "Features/Households/AddMemberForm",
  component: AddMemberForm,
  parameters: { route: "/households" },
  args: { householdId: familyHousehold.id ?? "", onAdded: fn(), onCancel: fn() },
  render: (args) => (
    <div className="card w-[36rem] max-w-full p-6">
      <AddMemberForm {...args} />
    </div>
  ),
} satisfies Meta<typeof AddMemberForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutCancel: Story = { args: { onCancel: undefined } };

export const Narrow: Story = {
  render: (args) => (
    <div className="card w-72 p-4">
      <AddMemberForm {...args} />
    </div>
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
        http.post("*/api/households/:id/members", () =>
          HttpResponse.json(
            { ...notFoundProblem, detail: "No user with this email exists." },
            { status: 404, headers: { "Content-Type": "application/problem+json" } },
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
        http.post("*/api/households/:id/members", async () => {
          await delay("infinite");
          return new HttpResponse(null, { status: 204 });
        }),
        ...handlers,
      ],
    },
  },
};
