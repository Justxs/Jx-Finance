import type { Meta, StoryObj } from "@storybook/react-vite";
import { withWidth } from "@/storybook/decorators";
import { Meter } from "./meter";

const meta = {
  title: "UI/Meter",
  component: Meter,
  args: { value: 68.75, max: 120, label: "Transportas" },
  decorators: [withWidth("card")],
} satisfies Meta<typeof Meter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Positive: Story = { args: { tone: "positive", value: 1875.5, max: 3200 } };

export const OverLimit: Story = { args: { tone: "negative", value: 204.11, max: 150 } };

export const Empty: Story = { args: { value: 0 } };

export const ZeroMax: Story = { args: { value: 10, max: 0 } };

export const Decorative: Story = { args: { label: undefined } };
