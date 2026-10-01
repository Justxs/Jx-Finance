import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import { getCreateContactMockHandler } from "@/api/generated/contacts/contacts.msw";
import { Card } from "@/components/ui/card/card";
import { contacts, serverErrorProblem } from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { ContactForm } from "./contact-form";

const meta = {
  title: "Features/Households/ContactForm",
  component: ContactForm,
  parameters: { route: "/households" },
  args: { onClose: fn() },
  render: (args) => (
    <Card className="w-[28rem] max-w-full p-6">
      <ContactForm {...args} />
    </Card>
  ),
} satisfies Meta<typeof ContactForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.type(canvas.getByRole("textbox", { name: "Name" }), "Jonas");
    await userEvent.click(canvas.getByRole("button", { name: "Add person" }));
    await waitFor(() => expect(args.onClose).toHaveBeenCalled());
  },
};

export const NameRequired: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Add person" }));
    await expect(canvas.getByRole("textbox", { name: "Name" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};

export const Rename: Story = {
  args: { initial: contacts[0] },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("textbox", { name: "Name" })).toHaveValue("Jonas");
  },
};

export const ServerErrorAfterSubmit: Story = {
  parameters: withHandlers(
    getCreateContactMockHandler(failWith({ ...serverErrorProblem, instance: "/api/contacts" })),
  ),
};

export const PendingAfterSubmit: Story = {
  parameters: withHandlers(getCreateContactMockHandler(pending)),
};

export const Lithuanian: Story = { globals: { locale: "lt" } };
