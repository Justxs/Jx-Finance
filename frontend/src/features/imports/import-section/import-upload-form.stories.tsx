import type { Meta, StoryObj } from "@storybook/react-vite";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { AccountResponse } from "@/api/generated/model";
import { accounts, checkingAccount } from "@/storybook/fixtures";
import { ImportUploadForm } from "./import-upload-form";

interface HarnessProps {
  accounts?: AccountResponse[];
  previewPending?: boolean;
}

function UploadFormHarness({
  accounts: accountList = accounts,
  previewPending = false,
}: Readonly<HarnessProps>) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [accountId, setAccountId] = useState(accountList[0]?.id ?? "");

  return (
    <section className="card w-[min(48rem,90vw)]">
      <ImportUploadForm
        accounts={accountList}
        accountId={accountId}
        onAccountChange={setAccountId}
        fileInputRef={fileInputRef}
        onPreview={() =>
          toast.message(fileInputRef.current?.files?.[0]?.name ?? "No file selected")
        }
        onFileChange={() => toast.message("File changed")}
        previewPending={previewPending}
      />
    </section>
  );
}

const meta = {
  title: "Features/Imports/ImportUploadForm",
  component: UploadFormHarness,
} satisfies Meta<typeof UploadFormHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const PreviewPending: Story = { args: { previewPending: true } };

export const SingleAccount: Story = { args: { accounts: [checkingAccount] } };

export const LongAccountNames: Story = {
  args: {
    accounts: accounts.map((account) => ({
      ...account,
      name: `${account.name} with a considerably longer descriptive label than usual`,
    })),
  },
};
