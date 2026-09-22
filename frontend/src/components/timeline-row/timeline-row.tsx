import type { ReactNode } from "react";

interface Props {
  day: string;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  amount: ReactNode;
}

export function TimelineRow({ day, title, subtitle, badge, amount }: Readonly<Props>) {
  return (
    <li className="flex items-baseline gap-4 py-2.5 text-sm">
      <span className="w-14 shrink-0 text-muted-foreground tabular-nums">{day}</span>
      {subtitle === undefined ? (
        <span className="min-w-0 flex-1 truncate font-medium" title={title}>
          {title}
        </span>
      ) : (
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium" title={title}>
            {title}
          </p>
          <p className="truncate text-xs text-muted-foreground" title={subtitle}>
            {subtitle}
          </p>
        </div>
      )}
      {badge}
      {amount}
    </li>
  );
}
