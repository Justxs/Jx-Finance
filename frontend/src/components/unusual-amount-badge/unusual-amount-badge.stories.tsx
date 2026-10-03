import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, userEvent } from "storybook/test";
import { categoryUnusual, payeeUnusual } from "@/storybook/fixtures";
import { UnusualAmountBadge } from "./unusual-amount-badge";

const meta = {
  title: "Components/UnusualAmountBadge",
  component: UnusualAmountBadge,
  parameters: { layout: "padded", route: "/transactions" },
  args: {
    transactionId: "55555555-0000-4000-8000-000000000016",
    unusual: payeeUnusual,
    dismissed: false,
  },
} satisfies Meta<typeof UnusualAmountBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PayeeBasis: Story = {
  play: async ({ canvas }) => {
    const badge = await canvas.findByRole("button", {
      name: /3\.1× the usual €42\.00 for this payee/u,
    });
    await userEvent.click(badge);
    await expect(await screen.findByRole("button", { name: "Not unusual" })).toBeVisible();
  },
};

export const CategoryBasis: Story = {
  args: { unusual: categoryUnusual },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("button", { name: /4× the usual €61\.90 in this category/u }),
    ).toBeInTheDocument();
  },
};

export const Dismissed: Story = {
  args: { dismissed: true },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: /Marked as not unusual/u }));
    await expect(
      await screen.findByRole("button", { name: "Mark as unusual again" }),
    ).toBeVisible();
  },
};

export const MarkingNotUnusual: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: /for this payee/u }));
    const dismiss = await screen.findByRole("button", { name: "Not unusual" });
    await userEvent.click(dismiss);
    await expect(dismiss).not.toBeInTheDocument();
  },
};

export const NotFlagged: Story = {
  args: { unusual: null },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector("button")).toBeNull();
  },
};
