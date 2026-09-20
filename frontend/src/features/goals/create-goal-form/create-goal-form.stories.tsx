import type { Meta, StoryObj } from "@storybook/react-vite";
import { fireEvent, fn, userEvent, within } from "storybook/test";
import { getCreateGoalMockHandler } from "@/api/generated/goals/goals.msw";
import { withWidth } from "@/storybook/decorators";
import { handlers, pending } from "@/storybook/handlers";
import { CreateGoalForm } from "./create-goal-form";

const meta = {
  title: "Features/Goals/CreateGoalForm",
  component: CreateGoalForm,
  args: { onCreated: fn(), onCancel: fn() },
  decorators: [withWidth("form")],
} satisfies Meta<typeof CreateGoalForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filled: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [name, target, current] = canvas.getAllByRole("textbox");
    await userEvent.type(name!, "Summer holiday in Madeira for the whole family");
    await userEvent.type(target!, "3200.00");
    await userEvent.type(current!, "1875.50");
  },
};

export const ValidationErrors: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [name, target, current] = canvas.getAllByRole("textbox");
    await userEvent.type(name!, "x");
    await userEvent.clear(name!);
    await userEvent.type(target!, "0");
    await userEvent.type(current!, "abc");
  },
};

export const SubmitPending: Story = {
  parameters: {
    msw: {
      handlers: [getCreateGoalMockHandler(pending), ...handlers],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [name, target] = canvas.getAllByRole("textbox");
    await fireEvent.change(name!, { target: { value: "New bicycle" } });
    await fireEvent.change(target!, { target: { value: "900" } });
    await userEvent.click(canvas.getByRole("button", { name: /add goal|pridėti tikslą/i }));
  },
};
