import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { type MoneyFlowKind, moneyFlowGraph } from "@/features/reports/money-flow/money-flow-graph";
import { withWidth } from "@/storybook/decorators";
import { reportSummaryMonth } from "@/storybook/fixtures";
import { MoneyFlowChart } from "./money-flow-chart";

const flowLabels: Record<MoneyFlowKind, string> = {
  income: "",
  expense: "",
  hub: "Money in",
  other: "Other",
  moneyBack: "Money back",
  fromSavings: "From savings",
  saved: "Saved",
};

const graph = moneyFlowGraph(reportSummaryMonth);

const meta = {
  title: "Features/Reports/MoneyFlowChart",
  component: MoneyFlowChart,
  args: {
    nodes: graph.nodes.map((node) => ({ ...node, label: node.label || flowLabels[node.kind] })),
    links: graph.links,
    moneyBack: graph.moneyBack,
    onSelect: fn(),
  },
  decorators: [withWidth("wide")],
} satisfies Meta<typeof MoneyFlowChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
