import {
  ResponsiveContainer,
  Sankey,
  type SankeyElementType,
  type SankeyLinkProps,
  type SankeyNodeProps,
  Tooltip,
} from "recharts";
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

const LABEL_GAP = 8;
const LABEL_MAX = 24;
const MARGIN = { top: 40, right: 168, bottom: 20, left: 168 };
const MUTED_KINDS: ReadonlySet<MoneyFlowKind> = new Set([
  "other",
  "moneyBack",
  "fromSavings",
  "saved",
]);
const SIDE_KINDS: ReadonlySet<MoneyFlowKind> = new Set(["moneyBack", "fromSavings", "saved"]);

function isFlowNode(value: unknown): value is MoneyFlowNode {
  return typeof value === "object" && value !== null && "kind" in value && "cents" in value;
}

function shortLabel(label: string) {
  return label.length > LABEL_MAX ? `${label.slice(0, LABEL_MAX - 1)}…` : label;
}

function nodeColor(node: MoneyFlowNode) {
  return MUTED_KINDS.has(node.kind) ? CHART_COLOR_MUTED : CHART_COLOR_PRIMARY;
}

function linkColor(source: MoneyFlowNode, target: MoneyFlowNode) {
  const end = source.kind === "hub" ? target : source;
  if (SIDE_KINDS.has(end.kind)) {
    return CHART_COLOR_MUTED;
  }
  return source.kind === "hub" ? CHART_COLOR_NEGATIVE : CHART_COLOR_POSITIVE;
}

function labelPlacement(props: SankeyNodeProps, node: MoneyFlowNode) {
  const middle = props.y + props.height / 2;
  if (node.kind === "hub") {
    return { x: props.x + props.width / 2, y: props.y - 22, anchor: "middle" } as const;
  }
  if (props.payload.depth === 0) {
    return { x: props.x - LABEL_GAP, y: middle - 2, anchor: "end" } as const;
  }
  return { x: props.x + props.width + LABEL_GAP, y: middle - 2, anchor: "start" } as const;
}

interface FlowTooltipProps {
  active?: boolean;
  payload?: readonly { payload?: { payload?: unknown } }[];
  moneyBack: readonly MoneyFlowNode[];
}

function FlowTooltip({ active, payload, moneyBack }: Readonly<FlowTooltipProps>) {
  const money = useMoney();
  const node = payload?.[0]?.payload?.payload;

  if (!active || !isFlowNode(node)) {
    return null;
  }

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

function renderLink(props: SankeyLinkProps) {
  const { source, target } = props.payload;
  const color = isFlowNode(source) && isFlowNode(target) ? linkColor(source, target) : "none";

  return (
    <path
      d={`M${props.sourceX},${props.sourceY} C${props.sourceControlX},${props.sourceY} ${props.targetControlX},${props.targetY} ${props.targetX},${props.targetY}`}
      fill="none"
      stroke={color}
      strokeWidth={props.linkWidth}
      strokeOpacity={0.25}
    />
  );
}

interface Props {
  nodes: MoneyFlowNode[];
  links: MoneyFlowLink[];
  moneyBack: readonly MoneyFlowNode[];
  onSelect: (node: MoneyFlowNode) => void;
}

export function MoneyFlowChart({ nodes, links, moneyBack, onSelect }: Readonly<Props>) {
  const money = useMoney();

  function renderNode(props: SankeyNodeProps) {
    const node = props.payload;
    if (!isFlowNode(node)) {
      return <g />;
    }
    const label = labelPlacement(props, node);

    return (
      <g>
        <rect
          x={props.x}
          y={props.y}
          width={props.width}
          height={props.height}
          fill={nodeColor(node)}
          className={node.categoryId ? "cursor-pointer" : undefined}
        />
        <text x={label.x} y={label.y} textAnchor={label.anchor} className="text-xs">
          <tspan className="fill-foreground">{shortLabel(node.label)}</tspan>
          <tspan x={label.x} dy={14} className="fill-muted-foreground tabular-nums">
            {money.format(node.cents / 100)}
          </tspan>
        </text>
      </g>
    );
  }

  function handleClick(item: SankeyNodeProps | SankeyLinkProps, type: SankeyElementType) {
    if (type === "node" && isFlowNode(item.payload) && item.payload.categoryId) {
      onSelect(item.payload);
    }
  }

  return (
    <ResponsiveContainer width="100%" height={MONEY_FLOW_HEIGHT}>
      <Sankey
        accessibilityLayer={false}
        data={{ nodes, links }}
        sort={false}
        nodeWidth={8}
        nodePadding={28}
        margin={MARGIN}
        node={renderNode}
        link={renderLink}
        onClick={handleClick}
      >
        <Tooltip content={<FlowTooltip moneyBack={moneyBack} />} isAnimationActive={false} />
      </Sankey>
    </ResponsiveContainer>
  );
}
