import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, userEvent, within, waitFor } from "storybook/test";
import { z } from "zod";
import { useAppForm } from "../app-form";

interface DemoProps {
  hint?: string;
  placeholder?: string;
  type?: "text" | "password" | "email";
  disabled?: boolean;
}

function Demo({ hint, placeholder, type, disabled }: Readonly<DemoProps>) {
  const form = useAppForm({
    defaultValues: { name: "" },
    validators: [
      {
        run: z.object({ name: z.string().min(1, "This field is required.") }),
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
        <form.Field name="name">
          {(field) => (
            <field.TextField
              id="demo-name"
              label="Name"
              hint={hint}
              placeholder={placeholder}
              type={type}
              disabled={disabled}
            />
          )}
        </form.Field>
        <form.SubmitButton>Save</form.SubmitButton>
      </form.AppForm>
    </form>
  );
}

const meta = {
  title: "Components/Form/TextField",
  component: Demo,
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { placeholder: "e.g. Groceries" } };

export const WithHint: Story = { args: { hint: "Shown on every report." } };

export const Password: Story = { args: { type: "password" } };

export const Disabled: Story = { args: { disabled: true } };

export const Invalid: Story = {
  args: { hint: "Shown on every report." },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    const input = canvas.getByLabelText("Name");
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(input).toHaveAttribute("aria-describedby", "demo-name-hint demo-name-error");
    await fireEvent.change(input, { target: { value: "Groceries" } });
    await waitFor(() => expect(input).toHaveAttribute("aria-invalid", "false"));
  },
};
