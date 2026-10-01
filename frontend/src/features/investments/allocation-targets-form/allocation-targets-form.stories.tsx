import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, userEvent, waitFor } from "storybook/test";
import { getSaveAllocationTargetsMockHandler } from "@/api/generated/investments/investments.msw";
import { Modal } from "@/components/modal";
import { Card } from "@/components/ui/card/card";
import {
  allocationSharesTotalProblem,
  allocationTargets,
  noAllocationTargets,
  usStock,
  worldEtf,
} from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { AllocationTargetsForm } from "./allocation-targets-form";

const meta = {
  title: "Features/Investments/AllocationTargetsForm",
  component: AllocationTargetsForm,
  parameters: { route: "/investments" },
  args: {
    targets: noAllocationTargets,
    dimension: "type",
    choices: {
      type: [
        { id: "stock", name: "Stock" },
        { id: "etf", name: "ETF" },
        { id: "fund", name: "Fund" },
        { id: "bond", name: "Bond" },
        { id: "crypto", name: "Crypto" },
        { id: "other", name: "Other" },
      ],
      currency: [
        { id: "eur", name: "EUR" },
        { id: "usd", name: "USD" },
      ],
      security: [
        { id: worldEtf.id, name: worldEtf.symbol },
        { id: usStock.id, name: usStock.symbol },
      ],
    },
    onSaved: fn(),
    onCancel: fn(),
  },
  render: (args) => (
    <Card className="w-[28rem] max-w-full p-6">
      <AllocationTargetsForm {...args} />
    </Card>
  ),
} satisfies Meta<typeof AllocationTargetsForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ExistingTargets: Story = {
  args: { targets: allocationTargets },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("textbox", { name: "ETF target share, percent" })).toHaveValue(
      "60",
    );
    await expect(canvas.getByText("Total 100% of 100%")).toBeVisible();
  },
};

export const InModal: Story = {
  args: { targets: allocationTargets },
  render: (args) => (
    <Modal open onOpenChange={args.onCancel} title="Target allocation">
      <AllocationTargetsForm {...args} />
    </Modal>
  ),
};

export const RefusesSharesThatDoNotAddUp: Story = {
  play: async ({ canvas, args }) => {
    await fireEvent.change(canvas.getByRole("textbox", { name: "ETF target share, percent" }), {
      target: { value: "60" },
    });
    await fireEvent.change(canvas.getByRole("textbox", { name: "Stock target share, percent" }), {
      target: { value: "30,5" },
    });
    await expect(canvas.getByText("Total 90.5% of 100%")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await expect(await canvas.findByText("The shares add up to 90.5%, not 100%.")).toBeVisible();
    await expect(args.onSaved).not.toHaveBeenCalled();
  },
};

export const SavesSharesThatAddUp: Story = {
  play: async ({ canvas, args }) => {
    await fireEvent.change(canvas.getByRole("textbox", { name: "ETF target share, percent" }), {
      target: { value: "70" },
    });
    await fireEvent.change(canvas.getByRole("textbox", { name: "Bond target share, percent" }), {
      target: { value: "30" },
    });
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(args.onSaved).toHaveBeenCalledWith({
        dimension: "type",
        targets: [
          { key: "etf", share: "70", symbol: null },
          { key: "bond", share: "30", symbol: null },
        ],
      }),
    );
  },
};

export const SwitchesTheDimension: Story = {
  args: { targets: allocationTargets },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("radio", { name: "Security" }));
    await expect(canvas.getByRole("textbox", { name: "VWCE target share, percent" })).toHaveValue(
      "",
    );
    await expect(canvas.queryByRole("textbox", { name: "ETF target share, percent" })).toBeNull();
  },
};

export const ServerError: Story = {
  args: { targets: allocationTargets },
  parameters: withHandlers(
    getSaveAllocationTargetsMockHandler(failWith(allocationSharesTotalProblem)),
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await expect(await canvas.findByText("The shares must add up to 100%.")).toBeVisible();
  },
};

export const PendingAfterSubmit: Story = {
  args: { targets: allocationTargets },
  parameters: withHandlers(getSaveAllocationTargetsMockHandler(pending)),
};
