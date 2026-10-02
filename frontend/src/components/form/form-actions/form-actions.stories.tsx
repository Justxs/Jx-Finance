import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
import { useAppForm } from "@/components/form/app-form";
import { Button } from "@/components/ui/button/button";
import { FormActions } from "./form-actions";

interface DemoProps {
  pending?: boolean;
  span?: boolean;
  extra?: boolean;
  onCancel?: () => void;
}

function Demo({ pending, span, extra, onCancel }: Readonly<DemoProps>) {
  const form = useAppForm({ defaultValues: { name: "Groceries" } });

  return (
    <form.AppForm>
      <div className="w-72">
        <form.FormActions span={span} pending={pending} submitLabel="Save" onCancel={onCancel}>
          {extra ? (
            <Button type="button" variant="outline">
              Save and add another
            </Button>
          ) : null}
        </form.FormActions>
      </div>
    </form.AppForm>
  );
}

const meta = {
  title: "Components/Form/FormActions",
  component: Demo,
  args: { onCancel: fn() },
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Pending: Story = { args: { pending: true } };

export const WithoutCancel: Story = { args: { onCancel: undefined } };

export const Spanning: Story = { args: { span: true } };

export const ExtraAction: Story = {
  args: { extra: true },
  play: async ({ canvas }) => {
    const names = canvas.getAllByRole("button").map((button) => button.textContent);
    await expect(names).toEqual(["Cancel", "Save and add another", "Save"]);
  },
};

export const WithoutForm: Story = {
  render: ({ onCancel }) => (
    <div className="w-72">
      <FormActions onCancel={onCancel}>
        <Button type="button">Apply</Button>
      </FormActions>
    </div>
  ),
  play: async ({ canvas }) => {
    const names = canvas.getAllByRole("button").map((button) => button.textContent);
    await expect(names).toEqual(["Cancel", "Apply"]);
  },
};
