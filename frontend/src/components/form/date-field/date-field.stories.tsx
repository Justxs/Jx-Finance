import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";
import { z } from "zod";
import { useAppForm } from "../app-form";

interface DemoProps {
  initial?: string;
  hint?: string;
}

function Demo({ initial = "", hint }: Readonly<DemoProps>) {
  const form = useAppForm({
    defaultValues: { date: initial },
    validators: [
      {
        run: z.object({ date: z.string().min(1, "This field is required.") }),
        triggers: ["change"],
      },
    ],
  });

  return (
    <form
      noValidate
      className="w-72 space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.AppForm>
        <form.Field name="date">
          {(field) => <field.DateField id="demo-date" label="Date" hint={hint} />}
        </form.Field>
        <form.SubmitButton>Save</form.SubmitButton>
      </form.AppForm>
    </form>
  );
}

const meta = {
  title: "Components/Form/DateField",
  component: Demo,
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filled: Story = { args: { initial: "2026-09-18" } };

export const WithHint: Story = { args: { hint: "The day the money left the account." } };

export const Invalid: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await expect(canvas.getByText("This field is required.")).toHaveAttribute(
      "id",
      "demo-date-error",
    );
  },
};
