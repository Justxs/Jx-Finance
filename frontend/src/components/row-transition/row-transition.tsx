import { type ReactNode, ViewTransition } from "react";

interface Props {
  children: ReactNode;
}

export function RowTransition({ children }: Readonly<Props>) {
  return (
    <ViewTransition enter="row-in" exit="row-out" update="row-move" share="none">
      {children}
    </ViewTransition>
  );
}
