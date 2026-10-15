import { type ChartCurve, defineChart, link, rect, text } from "@tanstack/charts";
import { type SankeyLink, type SankeyNode, sankeyDiagram } from "@tanstack/charts/network/sankey";
import { Chart } from "@tanstack/charts/react/tooltip";
import { tooltip } from "@tanstack/charts/tooltip";
import { useState } from "react";
import {
  CHART_COLOR_MUTED,
  CHART_COLOR_NEGATIVE,
  CHART_COLOR_POSITIVE,
  CHART_COLOR_PRIMARY,
} from "@/components/chart/chart-theme";
import {
  MONEY_FLOW_HEIGHT,
  type MoneyFlowKind,
  type MoneyFlowLink,
  type MoneyFlowNode,
} from "@/features/reports/money-flow/money-flow-graph";
import { useMoney } from "@/hooks/use-formatters";
import { cn } from "@/lib/utils";

type FlowNode = SankeyNode<MoneyFlowNode, MoneyFlowLink>;
type FlowLink = SankeyLink<MoneyFlowNode, MoneyFlowLink>;

const LABEL_GAP = 8;
const LABEL_MAX = 24;
const INSET = { top: 40, right: 168, bottom: 20, left: 168 };
const MUTED_KINDS: ReadonlySet<MoneyFlowKind> = new Set([
  "other",
  "moneyBack",
  "fromSavings",
  "saved",
]);
const SIDE_KINDS: ReadonlySet<MoneyFlowKind> = new Set(["moneyBack", "fromSavings", "saved"]);

const flowCurve: ChartCurve = {
  line([[x1, y1] = [0, 0], [x2, y2] = [0, 0]]) {
    const middle = (x1 + x2) / 2;
    return `M${x1},${y1}C${middle},${y1} ${middle},${y2} ${x2},${y2}`;
  },
  area: () => "",
};

function shortLabel(label: string) {
  return label.length > LABEL_MAX ? `${label.slice(0, LABEL_MAX - 1)}…` : label;
}

function isMuted(node: FlowNode) {
  return MUTED_KINDS.has(node.data.kind);
}

function linkColor(source: MoneyFlowNode, target: MoneyFlowNode) {
  const end = source.kind === "hub" ? target : source;
  if (SIDE_KINDS.has(end.kind)) {
    return CHART_COLOR_MUTED;
  }
  return source.kind === "hub" ? CHART_COLOR_NEGATIVE : CHART_COLOR_POSITIVE;
}

function labelPlacement(node: FlowNode) {
  if (node.data.kind === "hub") {
    return { x: node.x, y: node.y0 - 26, anchor: "middle" } as const;
  }
  if (node.depth === 0) {
    return { x: node.x0 - LABEL_GAP, y: node.y - 6, anchor: "end" } as const;
  }
  return { x: node.x1 + LABEL_GAP, y: node.y - 6, anchor: "start" } as const;
}

function flowNodeOf(datum: FlowNode | FlowLink | undefined) {
  return datum?.kind === "node" ? datum.data : null;
}

function nodeBars(nodes: readonly FlowNode[], fill: string) {
  return rect(nodes, { x1: "x0", x2: "x1", y1: "y0", y2: "y1", key: "key", inset: 0, fill });
}

function FlowTooltip({
  node,
  moneyBack,
}: Readonly<{ node: MoneyFlowNode; moneyBack: readonly MoneyFlowNode[] }>) {
  const money = useMoney();

  return (
    <div className="min-w-44 rounded-md border bg-popover px-3 py-2.5 text-popover-foreground shadow-lg">
      <p className="text-xs font-medium text-muted-foreground">{node.label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums">{money.format(node.cents / 100)}</p>
      {node.kind === "moneyBack" ? (
        <dl className="mt-1.5 space-y-1 border-t border-rule pt-1.5 text-sm">
          {moneyBack.map((item) => (
            <div key={item.categoryId ?? item.label} className="flex items-center gap-2">
              <dt className="text-muted-foreground">{item.label}</dt>
              <dd className="ml-auto pl-4 tabular-nums">{money.format(item.cents / 100)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}

interface Props {
  nodes: MoneyFlowNode[];
  links: MoneyFlowLink[];
  moneyBack: readonly MoneyFlowNode[];
  ariaLabel: string;
  onSelect: (node: MoneyFlowNode) => void;
}

export function MoneyFlowChart({ nodes, links, moneyBack, ariaLabel, onSelect }: Readonly<Props>) {
  const money = useMoney();
  const [overCategory, setOverCategory] = useState(false);

  const definition = defineChart({
    marks: [
      sankeyDiagram({
        nodes,
        links,
        nodeKey: (_node, { index }) => index,
        source: "source",
        target: "target",
        value: "value",
        nodeSort: null,
        linkSort: null,
        nodeWidth: 8,
        nodePadding: 28,
        inset: INSET,
        marks: ({ nodes: placed, links: flows }) => [
          link(flows, {
            x1: "x1",
            y1: "y1",
            x2: "x2",
            y2: "y2",
            key: "key",
            stroke: (flow) => linkColor(flow.sourceNode.data, flow.targetNode.data),
            strokeOpacity: 0.25,
            strokeWidth: (flow) => Math.max(1, flow.width),
            lineCap: "butt",
            curve: flowCurve,
          }),
          nodeBars(
            placed.filter((node) => !isMuted(node)),
            CHART_COLOR_PRIMARY,
          ),
          nodeBars(placed.filter(isMuted), CHART_COLOR_MUTED),
          text(placed, {
            x: (node) => labelPlacement(node).x,
            y: (node) => labelPlacement(node).y,
            anchor: (node) => labelPlacement(node).anchor,
            text: (node) => shortLabel(node.data.label),
            key: "key",
            fill: "var(--foreground)",
            fontSize: 12,
          }),
          text(placed, {
            x: (node) => labelPlacement(node).x,
            y: (node) => labelPlacement(node).y + 14,
            anchor: (node) => labelPlacement(node).anchor,
            text: (node) => money.format(node.data.cents / 100),
            key: "key",
            fill: CHART_COLOR_MUTED,
            fontSize: 12,
          }),
        ],
      }),
    ],
    scales: { x: null, y: null },
    guides: false,
    keyboard: false,
    focusRing: false,
    maxFocusDistance: 0,
    tooltip: { use: tooltip, anchor: "pointer", offset: 12, sticky: false },
  });

  return (
    <div aria-hidden="true" className={cn(overCategory && "cursor-pointer")}>
      <Chart
        definition={definition}
        height={MONEY_FLOW_HEIGHT}
        ariaLabel={ariaLabel}
        className="tabular-nums"
        onFocusChange={(point) => setOverCategory(Boolean(flowNodeOf(point?.datum)?.categoryId))}
        onSelect={(point) => {
          const node = flowNodeOf(point?.datum);
          if (node?.categoryId) {
            onSelect(node);
          }
        }}
        renderTooltipBody={({ points }) => {
          const node = flowNodeOf(points[0]?.datum);
          return node ? <FlowTooltip node={node} moneyBack={moneyBack} /> : null;
        }}
      />
    </div>
  );
}
