import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { useAppForm } from "../app-form";

interface DemoProps {
  grid?: boolean;
  onSubmit?: (name: string) => void;
}

function Demo({ grid, onSubmit }: Readonly<DemoProps>) {
  const form = useAppForm({
    defaultValues: { name: "Groceries", note: "" },
    onSubmit: ({ value }) => onSubmit?.(value.name),
  });

  return (
    <form.AppForm>
      <form.FormShell as={grid ? FormGrid : undefined} className={grid ? "w-xl" : "w-72 space-y-3"}>
        <form.Field name="name">
          {(field) => <field.TextField id="demo-shell-name" label="Name" />}
        </form.Field>
        <form.Field name="note">
          {(field) => <field.TextField id="demo-shell-note" label="Note" />}
        </form.Field>
        <form.FormActions span={grid} submitLabel="Save" />
      </form.FormShell>
    </form.AppForm>
  );
}

const meta = {
  title: "Components/Form/FormShell",
  component: Demo,
  args: { onSubmit: fn() },
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Grid: Story = { args: { grid: true } };

export const Submits: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(args.onSubmit).toHaveBeenCalledWith("Groceries"));
  },
};
