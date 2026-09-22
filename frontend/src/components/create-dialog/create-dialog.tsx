import { Plus } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button/button";

interface Props {
  label: string;
  title: string;
  className?: string;
  children: (close: () => void) => ReactNode;
}

export function CreateDialog({ label, title, className, children }: Readonly<Props>) {
  const [open, setOpen] = useState(false);

  function close() {
    setOpen(false);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus />
        {label}
      </Button>
      <Modal open={open} onOpenChange={setOpen} title={title} className={className}>
        {children(close)}
      </Modal>
    </>
  );
}
