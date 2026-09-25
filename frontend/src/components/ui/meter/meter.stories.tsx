import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { withWidth } from "@/storybook/decorators";
import type { Canvas } from "@/storybook/interactions";
import { Meter } from "./meter";

const meta = {
  title: "UI/Meter",
  component: Meter,
  args: { value: 68.75, max: 120, label: "Transportas" },
  decorators: [withWidth("card")],
} satisfies Meta<typeof Meter>;

export default meta;
type Story = StoryObj<typeof meta>;

function fill(canvas: Canvas) {
  const element = canvas.getByRole("meter").firstElementChild;
  if (!(element instanceof HTMLElement)) {
    throw new TypeError("expected the meter fill");
  }
  return element;
}

async function expectFill(canvas: Canvas, width: string) {
  await expect(fill(canvas).style.getPropertyValue("--meter-fill")).toBe(width);
}

export const Primary: Story = {
  play: async ({ canvas, args }) => {
    const meter = canvas.getByRole("meter", { name: "Transportas" });
    await expect(meter).toHaveAttribute("aria-valuemin", "0");
    await expect(meter).toHaveAttribute("aria-valuemax", "120");
    await expect(meter).toHaveAttribute("aria-valuenow", "68.75");
    await expectFill(canvas, `${(args.value / args.max) * 100}%`);
  },
};

export const Positive: Story = { args: { tone: "positive", value: 1875.5, max: 3200 } };

export const OverLimit: Story = {
  args: { tone: "negative", value: 204.11, max: 150 },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("meter")).toHaveAttribute("aria-valuenow", "150");
    await expectFill(canvas, "100%");
    await expect(fill(canvas)).toHaveClass("bg-destructive");
  },
};

export const Empty: Story = {
  args: { value: 0 },
  play: async ({ canvas }) => {
    await expectFill(canvas, "0%");
  },
};

export const NegativeValue: Story = {
  args: { value: -5 },
  play: async ({ canvas }) => {
    await expectFill(canvas, "0%");
  },
};

export const ZeroMax: Story = {
  args: { value: 10, max: 0 },
  play: async ({ canvas }) => {
    await expectFill(canvas, "0%");
  },
};

export const Decorative: Story = {
  args: { label: undefined },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.queryByRole("meter")).toBeNull();
    await expect(canvasElement.querySelector("[aria-hidden]")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  },
};
