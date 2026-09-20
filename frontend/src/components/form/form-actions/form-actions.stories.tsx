import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { useAppForm } from "../app-form";

interface DemoProps {
  pending?: boolean;
  span?: boolean;
  onCancel?: () => void;
}

function Demo({ pending, span, onCancel }: Readonly<DemoProps>) {
  const form = useAppForm({ defaultValues: { name: "Groceries" } });

  return (
    <form.AppForm>
      <div className="w-72">
        <form.FormActions span={span} pending={pending} submitLabel="Save" onCancel={onCancel} />
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
