import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, userEvent, waitFor } from "storybook/test";
import { getRenamePlaceMockHandler } from "@/api/generated/transactions/transactions.msw";
import { withWidth } from "@/storybook/decorators";
import { ownPlaces, serverErrorProblem } from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { PlaceRenameForm } from "./place-rename-form";

const maximaSpellings = ownPlaces.filter((place) => place.name.startsWith("Maxima"));

const meta = {
  title: "Features/Places/PlaceRenameForm",
  component: PlaceRenameForm,
  args: { places: maximaSpellings.slice(0, 1), onClose: fn(), onRenamed: fn() },
  decorators: [withWidth("form")],
} satisfies Meta<typeof PlaceRenameForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Rename: Story = {
  play: async ({ canvas, args }) => {
    await fireEvent.change(canvas.getByRole("textbox", { name: "Place" }), {
      target: { value: "  Maxima, Ukmergės g. 282  " },
    });
    await userEvent.click(canvas.getByRole("button", { name: "Rename" }));
    await waitFor(() => expect(args.onRenamed).toHaveBeenCalledTimes(1));
  },
};

export const Merge: Story = {
  args: { places: maximaSpellings },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("These places become one:")).toBeVisible();
    await expect(
      canvas.getByText("17 transactions you entered will read this place."),
    ).toBeVisible();
  },
};

export const Lithuanian: Story = { args: { places: maximaSpellings }, globals: { locale: "lt" } };

export const EmptyNameIsRefused: Story = {
  play: async ({ canvas, args }) => {
    await fireEvent.change(canvas.getByRole("textbox", { name: "Place" }), {
      target: { value: "   " },
    });
    await userEvent.click(canvas.getByRole("button", { name: "Rename" }));
    await waitFor(() =>
      expect(canvas.getByRole("textbox", { name: "Place" })).toHaveAttribute(
        "aria-invalid",
        "true",
      ),
    );
    await expect(args.onRenamed).not.toHaveBeenCalled();
  },
};

export const SubmitPending: Story = {
  args: { places: maximaSpellings },
  parameters: withHandlers(getRenamePlaceMockHandler(pending)),
};

export const ServerError: Story = {
  parameters: withHandlers(getRenamePlaceMockHandler(failWith(serverErrorProblem))),
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Rename" }));
    await expect(await canvas.findByRole("alert")).toBeInTheDocument();
    await expect(args.onRenamed).not.toHaveBeenCalled();
  },
};
