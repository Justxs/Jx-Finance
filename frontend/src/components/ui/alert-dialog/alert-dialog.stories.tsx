import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "../button/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./alert-dialog";

interface ExampleProps {
  long?: boolean;
  initiallyOpen?: boolean;
}

function AlertDialogExample({ long, initiallyOpen = true }: Readonly<ExampleProps>) {
  const [open, setOpen] = useState(initiallyOpen);

  function handleConfirm() {
    toast.success("Household left");
    setOpen(false);
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Leave household
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {long
              ? "Leave the Kazlauskai family household and lose access to every shared account?"
              : "Leave household?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {long
              ? "You will lose access to all shared accounts, budgets, goals and recurring bills that belong to this household. Transactions you created stay with the household. Another owner has to invite you again before you can come back."
              : "You will lose access to its shared accounts."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleConfirm}>
            Leave
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const meta = {
  title: "UI/AlertDialog",
  component: AlertDialog,
} satisfies Meta<typeof AlertDialog>;

export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <AlertDialogExample /> };

export const Closed: Story = { render: () => <AlertDialogExample initiallyOpen={false} /> };

export const LongContent: Story = { render: () => <AlertDialogExample long /> };
