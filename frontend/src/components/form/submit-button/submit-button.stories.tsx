import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, within, waitFor } from "storybook/test";
import { z } from "zod";
import { useAppForm } from "../app-form";

interface DemoProps {
  pending?: boolean;
}

function Demo({ pending }: Readonly<DemoProps>) {
  const form = useAppForm({
    defaultValues: { name: "Groceries" },
    validators: [
      {
        run: z.object({ name: z.string().min(1, "This field is required.") }),
        triggers: ["change"],
      },
    ],
  });

  return (
    <form.AppForm>
      <div className="w-72 space-y-3">
        <form.Field name="name">
          {(field) => <field.TextField id="demo-submit-name" label="Name" />}
        </form.Field>
        <form.SubmitButton pending={pending}>Save</form.SubmitButton>
      </div>
    </form.AppForm>
  );
}

const meta = {
  title: "Components/Form/SubmitButton",
  component: Demo,
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Pending: Story = { args: { pending: true } };

export const DisabledWhileInvalid: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await fireEvent.change(canvas.getByLabelText("Name"), { target: { value: "" } });
    await waitFor(() => expect(canvas.getByRole("button", { name: "Save" })).toBeDisabled());
  },
};
