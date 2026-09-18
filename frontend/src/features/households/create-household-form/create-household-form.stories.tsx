import type { Meta, StoryObj } from "@storybook/react-vite";
import { HttpResponse, delay, http } from "msw";
import { fn } from "storybook/test";
import { Modal } from "@/components/modal";
import { serverErrorProblem } from "@/storybook/fixtures";
import { handlers } from "@/storybook/handlers";
import { CreateHouseholdForm } from "./create-household-form";

const meta = {
  title: "Features/Households/CreateHouseholdForm",
  component: CreateHouseholdForm,
  parameters: { route: "/households" },
  args: { onCreated: fn(), onCancel: fn() },
  render: (args) => (
    <div className="card w-[28rem] max-w-full p-6">
      <CreateHouseholdForm {...args} />
    </div>
  ),
} satisfies Meta<typeof CreateHouseholdForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Narrow: Story = {
  render: (args) => (
    <div className="card w-64 p-4">
      <CreateHouseholdForm {...args} />
    </div>
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
        http.post("*/api/households", () =>
          HttpResponse.json(
            { ...serverErrorProblem, instance: "/api/households" },
            { status: 500, headers: { "Content-Type": "application/problem+json" } },
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
        http.post("*/api/households", async () => {
          await delay("infinite");
          return new HttpResponse(null, { status: 204 });
        }),
        ...handlers,
      ],
    },
  },
};
