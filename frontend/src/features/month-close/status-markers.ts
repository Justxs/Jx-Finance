import { CircleAlert, CircleCheck, CircleDashed, Clock } from "lucide-react";

export const statusMarkers = {
  notEnded: { icon: Clock, tone: "text-muted-foreground" },
  open: { icon: CircleDashed, tone: "text-muted-foreground" },
  closed: { icon: CircleCheck, tone: "text-income" },
  closedChanged: { icon: CircleAlert, tone: "text-expense" },
} as const;
