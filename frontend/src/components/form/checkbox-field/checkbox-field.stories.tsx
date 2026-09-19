import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { useAppForm } from "../app-form";

interface DemoProps {
  hint?: string;
  tone?: "muted" | "strong";
  disabled?: boolean;
}

function Demo({ hint, tone, disabled }: Readonly<DemoProps>) {
  const form = useAppForm({ defaultValues: { enabled: false } });

  return (
    <div className="w-80">
      <form.Field name="enabled">
        {(field) => (
          <field.CheckboxField
            id="demo-enabled"
            label="Sync every day"
            hint={hint}
            tone={tone}
            disabled={disabled}
          />
        )}
      </form.Field>
    </div>
  );
}

const meta = {
  title: "Components/Form/CheckboxField",
  component: Demo,
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithHint: Story = { args: { hint: "Runs shortly after midnight." } };

export const Muted: Story = { args: { tone: "muted" } };

export const Disabled: Story = { args: { disabled: true } };

export const Toggled: Story = {
  args: { hint: "Runs shortly after midnight." },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const checkbox = canvas.getByRole("checkbox", { name: "Sync every day" });
    await expect(checkbox).toHaveAttribute("aria-describedby", "demo-enabled-hint");
    await userEvent.click(checkbox);
    await expect(checkbox).toBeChecked();
  },
};
