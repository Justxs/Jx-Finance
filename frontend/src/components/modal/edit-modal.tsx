import { Fragment, type ReactNode } from "react";
import { useRetained } from "@/hooks/use-retained";
import { Modal } from "./modal";

interface Props<T extends { id: string }> {
  item: T | null;
  title: string;
  description?: (item: T) => string;
  onClose: () => void;
  children: (item: T) => ReactNode;
}

export function EditModal<T extends { id: string }>({
  item,
  title,
  description,
  onClose,
  children,
}: Readonly<Props<T>>) {
  const shown = useRetained(item);

  return (
    <Modal
      open={item !== null}
      onClose={onClose}
      title={title}
      description={shown ? description?.(shown) : undefined}
    >
      {shown ? <Fragment key={shown.id}>{children(shown)}</Fragment> : null}
    </Modal>
  );
}
