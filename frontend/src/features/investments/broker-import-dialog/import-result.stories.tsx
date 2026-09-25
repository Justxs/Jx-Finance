import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { withWidth } from "@/storybook/decorators";
import {
  brokerImportNothingNew,
  brokerImportResult,
  brokerImportWithWarnings,
} from "@/storybook/fixtures";
import { BrokerImportResult } from "./import-result";

const meta = {
  title: "Features/Investments/BrokerImportResult",
  component: BrokerImportResult,
  args: { result: brokerImportResult },
  decorators: [withWidth("form")],
} satisfies Meta<typeof BrokerImportResult>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Import finished.")).toBeVisible();
    await expect(canvas.queryByText("Check your holdings")).toBeNull();
  },
};

export const NothingNew: Story = { args: { result: brokerImportNothingNew } };

export const WithWarnings: Story = {
  args: { result: brokerImportWithWarnings },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("2 stock splits booked.")).toBeVisible();
    await expect(canvas.getByText("Merger or takeover: 1")).toBeVisible();
    await expect(canvas.getByText("Spin-off: 2")).toBeVisible();
    await expect(canvas.getByText("Other corporate action (XX): 1")).toBeVisible();

    const table = within(canvas.getByRole("table"));
    const nvda = within(table.getByRole("row", { name: /NVDA/u }));
    await expect(nvda.getByText("40")).toBeVisible();
    await expect(nvda.getByText("4")).toBeVisible();
    await expect(canvas.getByText(/A split can be entered by hand/u)).toBeVisible();
  },
};

export const WithWarningsDark: Story = {
  args: { result: brokerImportWithWarnings },
  globals: { theme: "dark" },
};

export const WithWarningsLithuanian: Story = {
  args: { result: brokerImportWithWarnings },
  globals: { locale: "lt" },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Susijungimas arba perėmimas: 1")).toBeVisible();
    await expect(canvas.getByText("Įrašyti 2 akcijų skaidymai.")).toBeVisible();
  },
};

export const OnlySkippedActions: Story = {
  args: { result: { ...brokerImportWithWarnings, positionMismatches: null } },
};

export const OnlyMismatches: Story = {
  args: { result: { ...brokerImportWithWarnings, skippedCorporateActions: [] } },
};

export const OnlySplitsImported: Story = {
  args: { result: { ...brokerImportNothingNew, splits: 1, duplicates: 0 } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Import finished.")).toBeVisible();
    await expect(canvas.getByText("1 stock split booked.")).toBeVisible();
  },
};
