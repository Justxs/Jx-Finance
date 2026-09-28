import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import type { MonthDrift } from "@/api/generated/model";
import {
  closedChangedMonthReview,
  closedMonthReview,
  currencyChangedMonthReview,
} from "@/storybook/fixtures";
import { DriftPanel } from "./drift-panel";

function driftOf(review: { drift: MonthDrift | null }): MonthDrift {
  if (!review.drift) {
    throw new Error("The fixture has no drift.");
  }
  return review.drift;
}

const changed = driftOf(closedChangedMonthReview);

const meta = {
  title: "Features/MonthClose/DriftPanel",
  component: DriftPanel,
  parameters: { layout: "padded" },
  args: { drift: changed, figures: closedChangedMonthReview.figures },
} satisfies Meta<typeof DriftPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Changed: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("table")).toBeVisible();
    await expect(canvas.getByText("Added")).toBeVisible();
    await expect(canvas.getByRole("link", { name: "IKI Antakalnis" })).toHaveAttribute(
      "href",
      expect.stringContaining("dateFrom=2026-08-30"),
    );
  },
};

export const MoreRowsThanShown: Story = {
  args: { drift: { ...changed, rowCount: 140 } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/latest 4 of 140 changed rows/)).toBeVisible();
  },
};

export const FiguresUnchanged: Story = {
  args: { drift: { ...changed, totals: driftOf(closedMonthReview).totals, categories: [] } },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText("The changes left the month's figures as they were."),
    ).toBeVisible();
    await expect(canvas.queryByRole("table")).toBeNull();
  },
};

export const CurrencyChanged: Story = {
  args: { drift: driftOf(currencyChangedMonthReview) },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent(/USD/);
    await expect(canvas.queryByRole("table")).toBeNull();
  },
};
