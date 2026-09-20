import type { Meta, StoryObj } from "@storybook/react-vite";
import { toast } from "sonner";
import { Button } from "../button/button";
import { Toaster } from "./sonner";

function savePromise() {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, 2000);
  });
}

function showSuccess() {
  toast.success("Transaction saved");
}

function showError() {
  toast.error("Could not reach the server");
}

function showWithDescription() {
  toast("Import finished", { description: "42 rows imported, 3 duplicates skipped." });
}

function showWithAction() {
  toast("Transaction deleted", {
    action: { label: "Undo", onClick: () => toast.success("Transaction restored") },
  });
}

function showWithCancel() {
  toast.warning("Budget almost used up", {
    description: "Food is at 94% of its monthly limit.",
    cancel: { label: "Dismiss", onClick: () => {} },
  });
}

function showLoading() {
  toast.promise(savePromise(), {
    loading: "Saving recurring bill",
    success: "Recurring bill saved",
    error: "Could not save the recurring bill",
  });
}

function showLong() {
  toast.error(
    "The import failed because the statement contains rows in a currency that does not match the selected account",
    {
      description:
        "Pick an account in the same currency as the statement or export the statement again from the bank with the correct account selected.",
    },
  );
}

function showPersistent() {
  toast.info("Stays until dismissed", { duration: Infinity, closeButton: true });
}

function ToastButton({ label, onClick }: Readonly<{ label: string; onClick: () => void }>) {
  return (
    <Button variant="outline" onClick={onClick}>
      {label}
    </Button>
  );
}

const meta = {
  title: "UI/Sonner",
  component: Toaster,
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => <ToastButton label="Show success toast" onClick={showSuccess} />,
};

export const ErrorToast: Story = {
  render: () => <ToastButton label="Show error toast" onClick={showError} />,
};

export const WithDescription: Story = {
  render: () => <ToastButton label="Show toast with description" onClick={showWithDescription} />,
};

export const WithAction: Story = {
  render: () => <ToastButton label="Show toast with undo" onClick={showWithAction} />,
};

export const WithCancel: Story = {
  render: () => <ToastButton label="Show warning with dismiss" onClick={showWithCancel} />,
};

export const PromiseLoading: Story = {
  render: () => <ToastButton label="Show loading toast" onClick={showLoading} />,
};

export const LongContent: Story = {
  render: () => <ToastButton label="Show long toast" onClick={showLong} />,
};

export const Persistent: Story = {
  render: () => <ToastButton label="Show persistent toast" onClick={showPersistent} />,
};

export const AllKinds: Story = {
  render: () => (
    <div className="flex max-w-md flex-wrap gap-2">
      <ToastButton label="Success" onClick={showSuccess} />
      <ToastButton label="Error" onClick={showError} />
      <ToastButton label="Description" onClick={showWithDescription} />
      <ToastButton label="Action" onClick={showWithAction} />
      <ToastButton label="Cancel" onClick={showWithCancel} />
      <ToastButton label="Promise" onClick={showLoading} />
    </div>
  ),
};
