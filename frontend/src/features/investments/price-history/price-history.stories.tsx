import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";
import {
  getDeleteSecurityPriceMockHandler,
  getImportSecurityPricesMockHandler,
  getSecurityPricesMockHandler,
} from "@/api/generated/investments/investments.msw";
import { withWidth } from "@/storybook/decorators";
import {
  missingColumnsProblem,
  securityNotHeldProblem,
  securityPrices,
  worldEtf,
} from "@/storybook/fixtures";
import { errorHandlers, failWith, loadingHandlers, withHandlers } from "@/storybook/handlers";
import { openedDialog, type Canvas } from "@/storybook/interactions";
import { PriceHistory } from "./price-history";

const meta = {
  title: "Features/Investments/PriceHistory",
  component: PriceHistory,
  args: { security: worldEtf },
  decorators: [withWidth("form")],
} satisfies Meta<typeof PriceHistory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findAllByRole("listitem")).toHaveLength(securityPrices.length);
    await expect(canvas.getByText("Last price")).toBeVisible();
  },
};

export const MixedSources: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Fetched")).toBeInTheDocument();
    await expect(canvas.getByText("Broker")).toBeInTheDocument();
    await expect(canvas.getByText("File")).toBeInTheDocument();
    await expect(canvas.getByText("Typed")).toBeInTheDocument();
  },
};

async function importTwoLines(canvas: Canvas) {
  const input = await canvas.findByLabelText("Import prices");
  await userEvent.upload(
    input,
    new File([["date;price", "2026-09-16;128,10", "2026-09-17;128.46"].join("\n")], "prices.csv", {
      type: "text/csv",
    }),
  );
}

export const ImportsPrices: Story = {
  parameters: withHandlers(
    getImportSecurityPricesMockHandler({ written: 2, skipped: 0, unreadable: 0 }),
  ),
  play: async ({ canvas }) => {
    await importTwoLines(canvas);
    await expect(
      await canvas.findByText("2 written, 0 unchanged, 0 unreadable"),
    ).toBeInTheDocument();
  },
};

export const ImportRefused: Story = {
  parameters: withHandlers(getImportSecurityPricesMockHandler(failWith(missingColumnsProblem))),
  play: async ({ canvas }) => {
    await importTwoLines(canvas);
    await expect(await canvas.findByRole("alert")).toBeVisible();
  },
};

export const Empty: Story = {
  parameters: withHandlers(getSecurityPricesMockHandler([])),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("No prices recorded yet.")).toBeVisible();
  },
};

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const Lithuanian: Story = { globals: { locale: "lt" } };

async function confirmFirstDelete(canvas: Canvas) {
  const buttons = await canvas.findAllByRole("button", { name: /^Delete: / });
  const first = buttons[0];
  if (!first) {
    throw new Error("The delete button is missing.");
  }
  await userEvent.click(first);
  const dialog = within(await openedDialog("alertdialog"));
  await expect(dialog.getByText(/VWCE/)).toBeVisible();
  await userEvent.click(dialog.getByRole("button", { name: "Delete" }));
}

export const DeletesPoint: Story = {
  play: async ({ canvas }) => {
    await confirmFirstDelete(canvas);

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    await expect(canvas.queryByRole("alert")).toBeNull();
  },
};

export const DeleteRefused: Story = {
  parameters: withHandlers(getDeleteSecurityPriceMockHandler(failWith(securityNotHeldProblem))),
  play: async ({ canvas }) => {
    await confirmFirstDelete(canvas);

    await expect(await canvas.findByRole("alert")).toBeVisible();
  },
};
