import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { FormGrid } from "@/components/ui/form-grid";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Modal } from "./modal";

interface ExampleProps {
  title?: string;
  description?: string;
  fields?: number;
  className?: string;
  initiallyOpen?: boolean;
}

function ModalExample({
  title = "Add account",
  description,
  fields = 2,
  className,
  initiallyOpen = true,
}: Readonly<ExampleProps>) {
  const [open, setOpen] = useState(initiallyOpen);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open modal</Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description}
        className={className}
      >
        <FormGrid>
          {Array.from({ length: fields }, (_, index) => (
            <div key={index} className="space-y-1.5">
              <Label htmlFor={`modal-story-field-${index}`}>Field {index + 1}</Label>
              <Input id={`modal-story-field-${index}`} />
            </div>
          ))}
          <div className="col-span-full flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setOpen(false)}>Save</Button>
          </div>
        </FormGrid>
      </Modal>
    </>
  );
}

const meta = {
  title: "Components/Modal",
  component: Modal,
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <ModalExample /> };

export const WithDescription: Story = {
  render: () => <ModalExample description="Accounts hold balances in a single currency." />,
};

export const Closed: Story = { render: () => <ModalExample initiallyOpen={false} /> };

export const ScrollingContent: Story = { render: () => <ModalExample fields={24} /> };

export const LongTitle: Story = {
  render: () => (
    <ModalExample
      title="Edit the recurring bill for the shared household electricity and heating contract"
      description="A long description that wraps over several lines so the header spacing next to the close button can be checked at narrow widths."
    />
  ),
};

export const Wide: Story = {
  render: () => <ModalExample className="sm:max-w-3xl" fields={6} />,
};
