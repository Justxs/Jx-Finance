import { Fragment, type ReactNode } from "react";
import { useRetained } from "@/hooks/use-retained";
import { Modal } from "./modal";

interface Props<T extends { id: string }> {
  item: T | null;
  title: string | ((item: T) => string);
  description?: (item: T) => string;
  className?: string;
  onClose: () => void;
  children: (item: T) => ReactNode;
}

function titleOf<T>(title: string | ((item: T) => string), item: T | null) {
  if (typeof title === "string") {
    return title;
  }

  return item ? title(item) : "";
}

export function EditModal<T extends { id: string }>({
  item,
  title,
  description,
  className,
  onClose,
  children,
}: Readonly<Props<T>>) {
  const shown = useRetained(item);

  return (
    <Modal
      open={item !== null}
      onClose={onClose}
      title={titleOf(title, shown)}
      description={shown ? description?.(shown) : undefined}
      className={className}
    >
      {shown ? <Fragment key={shown.id}>{children(shown)}</Fragment> : null}
    </Modal>
  );
}
