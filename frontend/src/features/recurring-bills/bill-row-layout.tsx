import type { ReactNode } from "react";
import { RowTransition } from "@/components/row-transition/row-transition";

interface Props {
  heading: ReactNode;
  meta: ReactNode;
  amount: ReactNode;
  actions: ReactNode;
}

export function BillRowLayout({ heading, meta, amount, actions }: Readonly<Props>) {
  return (
    <RowTransition>
      <li className="py-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">{heading}</div>
            {meta}
          </div>
          {amount}
          <div className="col-span-2 flex items-center justify-end sm:col-span-1">{actions}</div>
        </div>
      </li>
    </RowTransition>
  );
}
