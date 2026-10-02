import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import {
  getPlacesMockHandler,
  getRenamePlaceMockHandler,
} from "@/api/generated/transactions/transactions.msw";
import { withWidth } from "@/storybook/decorators";
import { placeNameTooLongProblem, serverErrorProblem } from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { openedDialog } from "@/storybook/interactions";
import { PlacesSection } from "./places-section";

const meta = {
  title: "Features/Places/PlacesSection",
  component: PlacesSection,
  decorators: [withWidth("wide")],
} satisfies Meta<typeof PlacesSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Maxima Ukmerges")).toBeVisible();
    await expect(canvas.getByText("14 transactions")).toBeVisible();
    await expect(canvas.getByText("1 transaction")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Merge (0)" })).toBeDisabled();
  },
};

export const Empty: Story = {
  parameters: withHandlers(getPlacesMockHandler([])),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/no places yet/i)).toBeVisible();
    await expect(canvas.queryByRole("button", { name: /merge/i })).toBeNull();
  },
};

export const Loading: Story = { parameters: withHandlers(getPlacesMockHandler(pending)) };

export const ServerError: Story = {
  parameters: withHandlers(getPlacesMockHandler(failWith(serverErrorProblem))),
};

export const Lithuanian: Story = { globals: { locale: "lt" } };

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

export const RenameDialog: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Edit: Maxima Ukmerges" }));
    const dialog = within(await openedDialog());
    await expect(
      dialog.getByRole("heading", { name: "Rename place: Maxima Ukmerges" }),
    ).toBeVisible();
    await expect(dialog.getByRole("textbox", { name: "Place" })).toHaveValue("Maxima Ukmerges");
    await expect(
      dialog.getByText("2 transactions you entered will read this place."),
    ).toBeVisible();
  },
};

export const MergeWithPreview: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("checkbox", { name: "Select Maxima X, Ukmergės g. 282, Vilnius" }),
    );
    await userEvent.click(canvas.getByRole("checkbox", { name: "Select Maxima Ukmerges" }));
    await userEvent.click(canvas.getByRole("checkbox", { name: "Select Maxima X Ukmergės g." }));
    await userEvent.click(canvas.getByRole("button", { name: "Merge (3)" }));
    const dialog = within(await openedDialog());
    await expect(dialog.getByRole("heading", { name: "Merge places" })).toBeVisible();
    await expect(dialog.getByRole("textbox", { name: "Place" })).toHaveValue(
      "Maxima X, Ukmergės g. 282, Vilnius",
    );
    await expect(
      dialog.getByText("17 transactions you entered will read this place."),
    ).toBeVisible();
    await expect(dialog.getAllByRole("listitem")).toHaveLength(3);
  },
};

export const MergeError: Story = {
  parameters: withHandlers(getRenamePlaceMockHandler(failWith(placeNameTooLongProblem))),
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("checkbox", { name: "Select Maxima Ukmerges" }));
    await userEvent.click(canvas.getByRole("checkbox", { name: "Select Maxima X Ukmergės g." }));
    await userEvent.click(canvas.getByRole("button", { name: "Merge (2)" }));
    const dialog = within(await openedDialog());
    await userEvent.click(dialog.getByRole("button", { name: "Merge" }));
    await expect(await dialog.findByRole("textbox", { name: "Place" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  },
};
