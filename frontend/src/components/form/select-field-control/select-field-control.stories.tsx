import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { z } from "zod";
import { useAppForm } from "../app-form";

interface DemoProps {
  hint?: string;
  disabled?: boolean;
}

function Demo({ hint, disabled }: Readonly<DemoProps>) {
  const form = useAppForm({
    defaultValues: { household: "" },
    validators: [
      {
        run: z.object({ household: z.string().min(1, "This field is required.") }),
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
        <form.Field name="household">
          {(field) => (
            <field.SelectFieldControl
              id="demo-household"
              label="Household"
              hint={hint}
              disabled={disabled}
              options={[
                { value: "", label: "Select a household" },
                { value: "home", label: "Home" },
                { value: "cabin", label: "Cabin" },
              ]}
            />
          )}
        </form.Field>
        <form.SubmitButton>Save</form.SubmitButton>
      </form.AppForm>
    </form>
  );
}

const meta = {
  title: "Components/Form/SelectFieldControl",
  component: Demo,
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithHint: Story = { args: { hint: "Members of the household see this entry." } };

export const Disabled: Story = { args: { disabled: true } };

export const Invalid: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await expect(canvas.getByRole("combobox")).toHaveAttribute(
      "aria-describedby",
      "demo-household-error",
    );
    await expect(canvas.getByText("This field is required.")).toBeVisible();
  },
};
