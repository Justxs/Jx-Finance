import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { getSettingsMockHandler } from "@/api/generated/settings/settings.msw";
import {
  clearOpenMonthReview,
  emptyMonthReview,
  ids,
  openMonthReview,
  settingsWith,
} from "@/storybook/fixtures";
import { withHandlers } from "@/storybook/handlers";
import { CloseChecklist } from "./close-checklist";

const meta = {
  title: "Features/MonthClose/CloseChecklist",
  component: CloseChecklist,
  parameters: { layout: "padded" },
  args: { month: "2026-08", checklist: openMonthReview.checklist },
} satisfies Meta<typeof CloseChecklist>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithOpenItems: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "Categorize" })).toHaveAttribute(
      "href",
      expect.stringContaining("uncategorized=true"),
    );
    await expect(canvas.getByRole("link", { name: "Review" })).toHaveAttribute(
      "href",
      expect.stringContaining("unusual=true"),
    );
    await expect(canvas.getByRole("link", { name: "Confirm" })).toBeVisible();
    await expect(canvas.getByText(/before the month ends/)).toBeVisible();
  },
};

export const WithPossibleDuplicates: Story = {
  args: { checklist: { ...clearOpenMonthReview.checklist, duplicates: 2 } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("2 transactions look like duplicates")).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Review" })).toHaveAttribute(
      "href",
      expect.stringContaining("duplicates=true"),
    );
  },
};

export const AllClear: Story = {
  args: { checklist: clearOpenMonthReview.checklist },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("link")).toBeNull();
  },
};

export const OpenItemsOnly: Story = {
  args: { openOnly: true },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText("No recurring entry is waiting")).toBeNull();
    await expect(canvas.getByRole("link", { name: "Categorize" })).toBeVisible();
  },
};

export const FeaturesOff: Story = {
  args: {
    checklist: {
      ...emptyMonthReview.checklist,
      unusual: null,
      unconfirmedRecurring: null,
      accounts: [],
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole("listitem")).toHaveLength(2);
  },
};

const accountStates = {
  ...emptyMonthReview.checklist,
  accounts: [
    {
      accountId: ids.accounts.checking,
      accountName: "Swedbank",
      state: "reconciled",
      date: "2026-08-31",
      difference: "0.00",
      currency: "eur",
    },
    {
      accountId: ids.accounts.savings,
      accountName: "Revolut",
      state: "differs",
      date: "2026-08-31",
      difference: "-12.30",
      currency: "eur",
    },
    {
      accountId: ids.accounts.shared,
      accountName: "Luminor",
      state: "imported",
      date: "2026-08-31",
      difference: null,
      currency: "eur",
    },
    {
      accountId: ids.accounts.cash,
      accountName: "SEB",
      state: "behind",
      date: "2026-08-20",
      difference: null,
      currency: "eur",
    },
  ],
} satisfies typeof emptyMonthReview.checklist;

export const AccountStates: Story = {
  args: { checklist: accountStates },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/^Swedbank reconciled on/)).toBeVisible();
    await expect(canvas.getByText(/^Revolut: the statement differs by €12.30 on/)).toBeVisible();
    await expect(canvas.getByText(/^Luminor imported through/)).toBeVisible();
    await expect(canvas.getByText(/^SEB: last statement .*, before the month ends$/)).toBeVisible();
    const reconcile = canvas.getAllByRole("link", { name: "Reconcile" });
    await expect(reconcile).toHaveLength(2);
    await expect(reconcile[0]).toHaveAttribute(
      "href",
      expect.stringContaining(`reconcile=${ids.accounts.savings}`),
    );
    await expect(canvas.getAllByRole("link", { name: "Import" })).toHaveLength(1);
  },
};

export const AccountStatesWithoutImport: Story = {
  args: { checklist: accountStates },
  parameters: withHandlers(getSettingsMockHandler(settingsWith({ features: { import: false } }))),
  play: async ({ canvas }) => {
    await expect(await canvas.findAllByRole("link", { name: "Reconcile" })).toHaveLength(2);
    await expect(canvas.queryByRole("link", { name: "Import" })).toBeNull();
  },
};
