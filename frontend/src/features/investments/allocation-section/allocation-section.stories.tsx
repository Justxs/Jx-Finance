import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, screen, userEvent, waitFor, within } from "storybook/test";
import { withWidth } from "@/storybook/decorators";
import {
  allocationTargets,
  noAllocationTargets,
  portfolio,
  securityAllocationTargets,
} from "@/storybook/fixtures";
import { openedDialog } from "@/storybook/interactions";
import { AllocationSection } from "./allocation-section";

const meta = {
  title: "Features/Investments/AllocationSection",
  component: AllocationSection,
  decorators: [withWidth("form")],
  parameters: { route: "/investments" },
  args: {
    holdings: portfolio.holdings,
    byType: portfolio.byType ?? [],
    byCurrency: portfolio.byCurrency ?? [],
    currency: portfolio.reportingCurrency,
    targets: noAllocationTargets,
  },
} satisfies Meta<typeof AllocationSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ByTypeAndCurrency: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("radio", { name: "Type" }));
    await expect(canvas.getByText("ETF")).toBeVisible();
    await userEvent.click(canvas.getByRole("radio", { name: "Currency" }));
    await expect(canvas.getByText("USD")).toBeVisible();
  },
};

export const SingleHolding: Story = { args: { holdings: portfolio.holdings.slice(0, 1) } };

export const NothingValued: Story = { args: { holdings: [] } };

export const WithTargets: Story = {
  args: { targets: allocationTargets },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("radio", { name: "Type" })).toBeChecked();
    await expect(canvas.getByText("Bond")).toBeVisible();
    await expect(canvas.getByText(/Target 10%/)).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Edit targets" })).toBeVisible();
  },
};

export const SplitsANewAmount: Story = {
  args: { targets: allocationTargets },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByRole("textbox", { name: "New amount to invest" }), "1000");
    await expect(canvas.getByText(/Add €922\.79/)).toBeVisible();
    await expect(canvas.getByText(/not advice/)).toBeVisible();
  },
};

export const TargetsByAnotherDimension: Story = {
  args: { targets: allocationTargets },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("radio", { name: "Currency" }));
    await expect(canvas.getByText("Your targets are set by Type.")).toBeVisible();
    await expect(canvas.queryByRole("textbox", { name: "New amount to invest" })).toBeNull();
  },
};

export const TargetsBySecurity: Story = {
  args: { targets: securityAllocationTargets },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("radio", { name: "Security" })).toBeChecked();
    await expect(canvas.getByText(/Target 70%/)).toBeVisible();
  },
};

export const SetsTargets: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Set targets" }));
    const dialog = within(await openedDialog());
    await expect(dialog.getByRole("radio", { name: "Security" })).toBeChecked();
    await fireEvent.change(dialog.getByRole("textbox", { name: "VWCE target share, percent" }), {
      target: { value: "70" },
    });
    await fireEvent.change(dialog.getByRole("textbox", { name: "MSFT target share, percent" }), {
      target: { value: "30" },
    });
    await userEvent.click(dialog.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  },
};

export const Phone: Story = {
  args: { targets: allocationTargets },
  decorators: [withWidth("w-[343px]")],
  parameters: {
    viewport: {
      options: {
        phone: { name: "Phone 375", styles: { width: "375px", height: "812px" }, type: "mobile" },
      },
    },
  },
  globals: { viewport: { value: "phone", isRotated: false } },
};
