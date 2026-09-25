import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { toast } from "sonner";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";
import { openedDialog } from "@/storybook/interactions";
import { Button } from "../ui/button/button";
import { ConfirmDeleteDialog } from "./confirm-delete-dialog";

interface Row {
  id: string;
  name: string;
}

const row: Row = { id: "row-1", name: "Maxima groceries" };

interface ExampleProps {
  initiallyOpen: boolean;
  itemLabel?: string;
}

function ConfirmDeleteExample({ initiallyOpen, itemLabel }: Readonly<ExampleProps>) {
  const [target, setTarget] = useState<Row | null>(initiallyOpen ? row : null);

  return (
    <>
      <Button variant="destructive" onClick={() => setTarget(row)}>
        Delete {row.name}
      </Button>
      <ConfirmDeleteDialog
        target={target}
        itemLabel={itemLabel}
        onCancel={() => setTarget(null)}
        onConfirm={(confirmed) => toast.success(`Deleted ${confirmed.name}`)}
      />
    </>
  );
}

function OwnCopyExample() {
  const [target, setTarget] = useState<Row | null>(row);

  return (
    <ConfirmDeleteDialog
      target={target}
      itemLabel="Šarūnas Kazlauskas"
      title="Deactivate this user?"
      description="They are signed out everywhere and can be reactivated later."
      confirmLabel="Deactivate"
      onCancel={() => setTarget(null)}
      onConfirm={(confirmed) => toast.success(`Deactivated ${confirmed.name}`)}
    />
  );
}

const meta = {
  title: "Components/ConfirmDeleteDialog",
  component: ConfirmDeleteDialog,
} satisfies Meta<typeof ConfirmDeleteDialog>;

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => <ConfirmDeleteExample initiallyOpen />,
  play: async () => {
    const dialog = within(await openedDialog("alertdialog"));
    await userEvent.click(dialog.getByRole("button", { name: "Delete" }));

    await expect(await screen.findByText("Deleted Maxima groceries")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  },
};

export const WithItemLabel: Story = {
  render: () => (
    <ConfirmDeleteExample initiallyOpen itemLabel="2026-09-14 · Maxima groceries · −42,18 €" />
  ),
  play: async () => {
    const dialog = await openedDialog("alertdialog");
    await expect(dialog).toHaveAccessibleDescription(/2026-09-14 · Maxima groceries/u);

    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    await expect(screen.queryByText(/^Deleted/u)).toBeNull();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  },
};

export const WithLongItemLabel: Story = {
  render: () => (
    <ConfirmDeleteExample
      initiallyOpen
      itemLabel="2026-09-14 · Quarterly insurance premium for the shared household apartment and storage unit · −1 284,50 €"
    />
  ),
};

export const WithOwnCopy: Story = {
  render: () => <OwnCopyExample />,
  play: async () => {
    await openedDialog("alertdialog");
    await userEvent.keyboard("{Escape}");

    await expect(screen.queryByText(/^Deactivated/u)).toBeNull();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  },
};

export const Closed: Story = {
  render: () => <ConfirmDeleteExample initiallyOpen={false} />,
  play: async () => {
    await expect(screen.queryByRole("alertdialog")).toBeNull();
  },
};
