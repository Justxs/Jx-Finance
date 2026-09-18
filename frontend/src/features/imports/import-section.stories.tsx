import type { Meta, StoryObj } from "@storybook/react-vite";
import { delay, http, HttpResponse } from "msw";
import { userEvent, within } from "storybook/test";
import { QueryBoundary } from "@/components/query-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { accounts, checkingAccount, transactionsCsv } from "@/storybook/fixtures";
import { emptyHandlers, errorHandlers, handlers, loadingHandlers } from "@/storybook/handlers";
import { ImportSection } from "./import-section";

async function neverResolve() {
  await delay("infinite");
  return new HttpResponse(null, { status: 204 });
}

async function uploadAndPreview(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  const previewButton = await canvas.findByRole("button", { name: /preview|peržiūra/i });
  const fileInput = canvasElement.querySelector<HTMLInputElement>("#import-file");
  if (!fileInput) {
    return;
  }
  const file = new File([transactionsCsv], "swedbank-2026-09.csv", { type: "text/csv" });
  await userEvent.upload(fileInput, file);
  await userEvent.click(previewButton);
}

const meta = {
  title: "Features/Imports/ImportSection",
  component: ImportSection,
  parameters: { layout: "fullscreen" },
  args: { accounts },
  render: (args) => (
    <div className="mx-auto max-w-6xl p-6">
      <QueryBoundary fallback={<Skeleton className="h-40 w-full" />}>
        <ImportSection {...args} />
      </QueryBoundary>
    </div>
  ),
} satisfies Meta<typeof ImportSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SingleAccount: Story = { args: { accounts: [checkingAccount] } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const Previewed: Story = {
  play: async ({ canvasElement }) => {
    await uploadAndPreview(canvasElement);
  },
};

export const PreviewedEmptyFile: Story = {
  parameters: { msw: { handlers: emptyHandlers } },
  play: async ({ canvasElement }) => {
    await uploadAndPreview(canvasElement);
  },
};

export const PreviewPending: Story = {
  parameters: {
    msw: { handlers: [http.post("*/api/import/swedbank/preview", neverResolve), ...handlers] },
  },
  play: async ({ canvasElement }) => {
    await uploadAndPreview(canvasElement);
  },
};
