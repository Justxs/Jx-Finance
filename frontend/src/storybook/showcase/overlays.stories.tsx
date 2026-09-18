import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";

const meta = { title: "Components/Overlays" } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function ModalExample({ long }: Readonly<{ long?: boolean }>) {
  const [open, setOpen] = useState(true);
  const fields = long ? 14 : 3;

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open dialog</Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Add recurring bill"
        description="Bills remind you before they are due."
      >
        <div className="form-grid">
          {Array.from({ length: fields }, (_, index) => (
            <div key={index} className="space-y-1.5">
              <Label htmlFor={`modal-field-${index}`}>Field {index + 1}</Label>
              <Input id={`modal-field-${index}`} />
            </div>
          ))}
          <div className="col-span-full flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setOpen(false)}>Save</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function ConfirmExample() {
  const [target, setTarget] = useState<string | null>("row-1");

  return (
    <>
      <Button variant="destructive" onClick={() => setTarget("row-1")}>
        Delete
      </Button>
      <ConfirmDeleteDialog
        target={target}
        onCancel={() => setTarget(null)}
        onConfirm={() => toast.success("Deleted")}
      />
      <Toaster />
    </>
  );
}

function ToastExample() {
  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={() => toast.success("Transaction saved")}>
        Success
      </Button>
      <Button variant="outline" onClick={() => toast.error("Could not reach the server")}>
        Error
      </Button>
      <Toaster />
    </div>
  );
}

export const ModalShort: Story = { render: () => <ModalExample /> };

export const ModalScrolling: Story = { render: () => <ModalExample long /> };

export const ConfirmDelete: Story = { render: () => <ConfirmExample /> };

export const Toasts: Story = { render: () => <ToastExample /> };
