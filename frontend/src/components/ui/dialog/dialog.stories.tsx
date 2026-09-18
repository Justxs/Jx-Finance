import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button } from "../button";
import { Input } from "../input";
import { Label } from "../label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

interface ExampleProps {
  initiallyOpen?: boolean;
  showCloseButton?: boolean;
  footerCloseButton?: boolean;
  paragraphs?: number;
}

function DialogExample({
  initiallyOpen = true,
  showCloseButton,
  footerCloseButton,
  paragraphs = 0,
}: Readonly<ExampleProps>) {
  const [open, setOpen] = useState(initiallyOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>Rename account</DialogTrigger>
      <DialogContent showCloseButton={showCloseButton}>
        <DialogHeader>
          <DialogTitle>Rename account</DialogTitle>
          <DialogDescription>The new name is visible to every household member.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="dialog-story-name">Name</Label>
          <Input id="dialog-story-name" defaultValue="Swedbank checking" />
        </div>
        {Array.from({ length: paragraphs }, (_, index) => (
          <p key={index} className="text-sm text-muted-foreground">
            Paragraph {index + 1}. Renaming an account does not change its transactions, budgets or
            recurring bills. Exports created earlier keep the old name.
          </p>
        ))}
        <DialogFooter showCloseButton={footerCloseButton}>
          {footerCloseButton ? null : (
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          )}
          <Button onClick={() => setOpen(false)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const meta = {
  title: "UI/Dialog",
  component: Dialog,
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <DialogExample /> };

export const Closed: Story = { render: () => <DialogExample initiallyOpen={false} /> };

export const WithoutCloseButton: Story = {
  render: () => <DialogExample showCloseButton={false} />,
};

export const FooterCloseButton: Story = { render: () => <DialogExample footerCloseButton /> };

export const LongContent: Story = { render: () => <DialogExample paragraphs={12} /> };
