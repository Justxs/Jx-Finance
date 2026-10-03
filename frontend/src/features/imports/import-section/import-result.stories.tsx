import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent } from "storybook/test";
import { getSettingsMockHandler } from "@/api/generated/settings/settings.msw";
import {
  differingReconciliation,
  ids,
  matchedReconciliation,
  settingsWith,
} from "@/storybook/fixtures";
import { withHandlers } from "@/storybook/handlers";
import { ImportResultPanel } from "./import-result";

const result = {
  imported: 6,
  linked: 0,
  skipped: 0,
  uncategorized: 2,
  accountId: ids.accounts.checking,
  dateFrom: "2026-09-10",
  dateTo: "2026-09-18",
};

const meta = {
  title: "Features/Imports/ImportResultPanel",
  component: ImportResultPanel,
  args: { result, onLeave: fn(), onImportAnother: fn() },
} satisfies Meta<typeof ImportResultPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, args }) => {
    await expect(await canvas.findByRole("status")).toHaveTextContent(/^Imported 6 rows\.$/);
    const categorize = canvas.getByRole("link", { name: "Categorize 2 rows" });
    await expect(categorize).toHaveAttribute("href", expect.stringContaining("uncategorized=true"));
    await expect(categorize).toHaveAttribute(
      "href",
      expect.stringContaining(`accountId=${ids.accounts.checking}`),
    );
    await expect(categorize).toHaveAttribute(
      "href",
      expect.stringContaining("dateFrom=2026-09-10"),
    );
    await expect(canvas.getByRole("link", { name: "View imported rows" })).toBeVisible();
    await expect(canvas.queryByRole("link", { name: /^Month close/ })).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Import another file" }));
    await expect(args.onImportAnother).toHaveBeenCalled();
  },
};

export const EverythingCategorized: Story = {
  args: { result: { ...result, uncategorized: 0 } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("link", { name: "View imported rows" })).toBeVisible();
    await expect(canvas.queryByRole("link", { name: /^Categorize/ })).not.toBeInTheDocument();
  },
};

export const SingleRow: Story = {
  args: { result: { ...result, imported: 1, uncategorized: 1 } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("status")).toHaveTextContent(/^Imported 1 row\.$/);
    await expect(canvas.getByRole("link", { name: "Categorize 1 row" })).toBeVisible();
  },
};

export const WithSkippedDuplicates: Story = {
  args: { result: { ...result, skipped: 2 } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("status")).toHaveTextContent(
      "Imported 6 rows. 2 duplicates skipped.",
    );
  },
};

export const WithLinkedEntries: Story = {
  args: { result: { ...result, linked: 2 } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("status")).toHaveTextContent(
      "Imported 6 rows. 2 linked to entries you made by hand.",
    );
  },
};

export const OnlyDuplicates: Story = {
  args: { result: { ...result, imported: 0, skipped: 3, uncategorized: 0 } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("status")).toHaveTextContent(/^3 duplicates skipped\.$/);
    await expect(
      canvas.queryByRole("link", { name: "View imported rows" }),
    ).not.toBeInTheDocument();
  },
};

export const StatementMatches: Story = {
  args: {
    result: { ...result, reconciliation: { ...matchedReconciliation, source: "statement" } },
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/^Balance matches the statement on/)).toBeVisible();
    await expect(canvas.getByText("€2,512.40")).toHaveClass("border-double");
    await expect(canvas.getByRole("link", { name: "Month close: August 2026" })).toHaveAttribute(
      "href",
      expect.stringContaining("/reports/month?month=2026-08"),
    );
  },
};

export const StatementDiffers: Story = {
  args: { result: { ...result, reconciliation: differingReconciliation } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/^The statement differs by €12.30 on/)).toHaveClass(
      "text-expense",
    );
  },
};

export const MonthCloseOff: Story = {
  parameters: withHandlers(
    getSettingsMockHandler(settingsWith({ features: { monthClose: false } })),
  ),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("link", { name: "View imported rows" })).toBeVisible();
    await expect(canvas.queryByRole("link", { name: /^Month close/ })).not.toBeInTheDocument();
  },
};
