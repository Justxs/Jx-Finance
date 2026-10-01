import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import { getCreateContactPaymentMockHandler } from "@/api/generated/contacts/contacts.msw";
import { Card } from "@/components/ui/card/card";
import { contacts, serverErrorProblem } from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { ContactPaymentForm } from "./contact-payment-form";

const [jonas, ona, tomas] = contacts;

const meta = {
  title: "Features/Households/ContactPaymentForm",
  component: ContactPaymentForm,
  parameters: { route: "/households" },
  args: { contact: jonas!, onClose: fn() },
  render: (args) => (
    <Card className="w-[36rem] max-w-full p-6">
      <ContactPaymentForm {...args} />
    </Card>
  ),
} satisfies Meta<typeof ContactPaymentForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SettlesWhatTheyOwe: Story = {
  play: async ({ args, canvas }) => {
    await expect(canvas.getByRole("radio", { name: "Jonas paid you" })).toBeChecked();
    await expect(canvas.getByRole("textbox", { name: "Amount" })).toHaveValue("42.50");
    await userEvent.click(canvas.getByRole("button", { name: "Record payment" }));
    await waitFor(() => expect(args.onClose).toHaveBeenCalled());
  },
};

export const PaysBackWhatYouOwe: Story = {
  args: { contact: ona! },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("radio", { name: "You paid Ona" })).toBeChecked();
    await expect(canvas.getByRole("textbox", { name: "Amount" })).toHaveValue("15.00");
  },
};

export const LendToSomeoneEven: Story = {
  args: { contact: tomas! },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("radio", { name: "You paid Tomas" })).toBeChecked();
    await userEvent.click(canvas.getByRole("button", { name: "Record payment" }));
    await expect(await canvas.findByRole("textbox", { name: "Amount" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  },
};

export const ServerErrorAfterSubmit: Story = {
  parameters: withHandlers(
    getCreateContactPaymentMockHandler(
      failWith({ ...serverErrorProblem, instance: `/api/contacts/${jonas!.id}/payments` }),
    ),
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Record payment" }));
    await expect(await canvas.findByRole("alert")).toBeVisible();
  },
};

export const Saving: Story = {
  parameters: withHandlers(getCreateContactPaymentMockHandler(pending)),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Record payment" }));
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: /record payment/i })).toHaveAttribute(
        "aria-busy",
        "true",
      ),
    );
  },
};

export const Lithuanian: Story = { globals: { locale: "lt" } };
