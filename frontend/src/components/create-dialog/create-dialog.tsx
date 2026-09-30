import { type LucideIcon, Plus } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button/button";

interface Props {
  label: string;
  title: string;
  icon?: LucideIcon;
  className?: string;
  secondary?: boolean;
  children: (close: () => void) => ReactNode;
}

export function CreateDialog({
  label,
  title,
  icon: Icon = Plus,
  className,
  secondary = false,
  children,
}: Readonly<Props>) {
  const [open, setOpen] = useState(false);

  function close() {
    setOpen(false);
  }

  return (
    <>
      <Button
        variant={secondary ? "outline" : "default"}
        size={secondary ? "sm" : "default"}
        onClick={() => setOpen(true)}
      >
        <Icon />
        {label}
      </Button>
      <Modal open={open} onOpenChange={setOpen} title={title} className={className}>
        {children(close)}
      </Modal>
    </>
  );
}
