import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button/button";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { Input } from "@/components/ui/input/input";
import { Label } from "@/components/ui/label/label";

const meta = { title: "Components/Overlays" } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function OverlaysExample() {
  const [editing, setEditing] = useState(false);
  const [target, setTarget] = useState<string | null>(null);

  function handleSave() {
    setEditing(false);
    toast.success("Bill saved");
  }

  function handleDelete() {
    setTarget(null);
    toast.success("Deleted");
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => setEditing(true)}>Edit bill</Button>
      <Button variant="destructive" onClick={() => setTarget("row-1")}>
        Delete bill
      </Button>
      <Button variant="outline" onClick={() => toast.error("Could not reach the server")}>
        Fail a request
      </Button>
      <Modal
        open={editing}
        onOpenChange={setEditing}
        title="Edit recurring bill"
        description="Bills remind you before they are due."
      >
        <FormGrid>
          <div className="space-y-1.5">
            <Label htmlFor="overlay-name">Name</Label>
            <Input id="overlay-name" defaultValue="Telia" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="overlay-amount">Amount</Label>
            <Input id="overlay-amount" inputMode="decimal" defaultValue="24.99" />
          </div>
          <div className="col-span-full flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </FormGrid>
      </Modal>
      <ConfirmDeleteDialog
        target={target}
        onCancel={() => setTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

export const Overview: Story = { render: () => <OverlaysExample /> };
