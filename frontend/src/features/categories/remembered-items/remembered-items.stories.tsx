import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";
import {
  getForgetReceiptItemCategoryMockHandler,
  getReceiptItemCategoriesMockHandler,
} from "@/api/generated/receipts/receipts.msw";
import { withWidth } from "@/storybook/decorators";
import {
  noRememberedItemCategories,
  rememberedItemCategories,
  serverErrorProblem,
} from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { openedDialog } from "@/storybook/interactions";
import { RememberedItems } from "./remembered-items";

const meta = {
  title: "Features/Categories/RememberedItems",
  component: RememberedItems,
  decorators: [withWidth("wide")],
} satisfies Meta<typeof RememberedItems>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("dantu pasta colgate")).toBeVisible();
    await expect(canvas.getByText(/Deleted or unshared category/u)).toBeVisible();
    await expect(canvas.getByRole("searchbox", { name: "Find an item" })).toBeVisible();
  },
};

export const Empty: Story = {
  parameters: withHandlers(getReceiptItemCategoriesMockHandler(noRememberedItemCategories)),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/Nothing remembered yet/u)).toBeVisible();
  },
};

export const NoMatches: Story = {
  parameters: withHandlers(
    getReceiptItemCategoriesMockHandler(({ request }) =>
      new URL(request.url).searchParams.get("search")
        ? noRememberedItemCategories
        : rememberedItemCategories,
    ),
  ),
  play: async ({ canvas }) => {
    await userEvent.type(await canvas.findByRole("searchbox", { name: "Find an item" }), "kava");
    await expect(await canvas.findByText("No remembered item matches this search.")).toBeVisible();
  },
};

export const MoreThanShown: Story = {
  parameters: withHandlers(
    getReceiptItemCategoriesMockHandler({ ...rememberedItemCategories, total: 340 }),
  ),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText(
        "Showing the 4 most recently used of 340. Search to find the others.",
      ),
    ).toBeVisible();
  },
};

export const Loading: Story = {
  parameters: withHandlers(getReceiptItemCategoriesMockHandler(pending)),
};

export const ServerError: Story = {
  parameters: withHandlers(getReceiptItemCategoriesMockHandler(failWith(serverErrorProblem))),
};

export const Forgetting: Story = {
  parameters: withHandlers(getForgetReceiptItemCategoryMockHandler()),
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Forget: pienas" }));
    const dialog = within(await openedDialog("alertdialog"));
    await expect(dialog.getByRole("heading", { name: "Forget this item?" })).toBeVisible();
    await userEvent.click(dialog.getByRole("button", { name: "Forget" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  },
};

export const Lithuanian: Story = {
  globals: { locale: "lt" },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Įsimintos kvitų prekės")).toBeVisible();
  },
};

export const Phone: Story = {
  parameters: {
    viewport: {
      options: {
        phone: { name: "Phone 375", styles: { width: "375px", height: "812px" }, type: "mobile" },
      },
    },
  },
  globals: { viewport: { value: "phone", isRotated: false } },
};
