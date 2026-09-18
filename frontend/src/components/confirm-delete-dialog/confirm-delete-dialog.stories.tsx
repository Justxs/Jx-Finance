import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDeleteDialog } from "./confirm-delete-dialog";
import { Button } from "../ui/button";

interface Row {
  id: string;
  name: string;
}

const row: Row = { id: "row-1", name: "Maxima groceries" };

function ConfirmDeleteExample({ initiallyOpen }: Readonly<{ initiallyOpen: boolean }>) {
  const [target, setTarget] = useState<Row | null>(initiallyOpen ? row : null);

  return (
    <>
      <Button variant="destructive" onClick={() => setTarget(row)}>
        Delete {row.name}
      </Button>
      <ConfirmDeleteDialog
        target={target}
        onCancel={() => setTarget(null)}
        onConfirm={(confirmed) => toast.success(`Deleted ${confirmed.name}`)}
      />
    </>
  );
}

const meta = {
  title: "Components/ConfirmDeleteDialog",
  component: ConfirmDeleteDialog,
} satisfies Meta<typeof ConfirmDeleteDialog>;

export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <ConfirmDeleteExample initiallyOpen /> };

export const Closed: Story = { render: () => <ConfirmDeleteExample initiallyOpen={false} /> };
