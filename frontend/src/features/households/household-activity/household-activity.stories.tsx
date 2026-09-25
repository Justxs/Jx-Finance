import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor } from "storybook/test";
import { getHouseholdAuditMockHandler } from "@/api/generated/households/households.msw";
import { withWidth } from "@/storybook/decorators";
import { familyHousehold, householdAuditEvents, memberUser } from "@/storybook/fixtures";
import { errorHandlers, loadingHandlers, withHandlers } from "@/storybook/handlers";
import { emptyPage } from "@/storybook/handlers/lists";
import { chooseOption } from "@/storybook/interactions";
import { HouseholdActivity } from "./household-activity";

const meta = {
  title: "Features/Households/HouseholdActivity",
  component: HouseholdActivity,
  parameters: { layout: "padded", route: "/households" },
  args: { householdId: familyHousehold.id, members: familyHousehold.members },
  decorators: [withWidth("wide")],
} satisfies Meta<typeof HouseholdActivity>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText(`${memberUser.displayName} changed Maxima, 42.18 EUR`),
    ).toBeVisible();
    await expect(
      canvas.getByText("amount 40.00 EUR → 42.18 EUR, category Maistas → Maisto prekės"),
    ).toBeVisible();
    await expect(
      canvas.getByText(/imported Swedbank CSV into Bendra sąskaita, 42 entries/u),
    ).toBeVisible();
    await expect(canvas.getByText(/edited in bulk: Category set to Maistas/u)).toBeVisible();
    await expect(canvas.getAllByRole("listitem")).toHaveLength(10);
    await expect(canvas.getByText("Page 1 of 2")).toBeVisible();
  },
};

export const Dark: Story = { globals: { theme: "dark" } };

export const Lithuanian: Story = {
  globals: { locale: "lt" },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText(`${memberUser.displayName} pakeitė: Maxima, 42.18 EUR`),
    ).toBeVisible();
    await expect(
      canvas.getByText("suma 40.00 EUR → 42.18 EUR, kategorija Maistas → Maisto prekės"),
    ).toBeVisible();
  },
};

export const Empty: Story = {
  parameters: withHandlers(getHouseholdAuditMockHandler(emptyPage)),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText("Nothing has happened in this household yet."),
    ).toBeVisible();
  },
};

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const LoadFailed: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const Paged: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Page 1 of 2")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(canvas.getByText("Page 2 of 2")).toBeVisible());
    await expect(await canvas.findByText(/created the household Šeima/u)).toBeVisible();
    await expect(canvas.getAllByRole("listitem")).toHaveLength(householdAuditEvents.length - 10);
  },
};

export const FilterByMemberAndKind: Story = {
  play: async ({ canvas }) => {
    await canvas.findByText("Page 1 of 2");

    await chooseOption(canvas.getByLabelText("Member"), memberUser.displayName);
    await waitFor(() =>
      expect(canvas.getAllByRole("listitem")).toHaveLength(
        householdAuditEvents.filter((event) => event.actorName === memberUser.displayName).length,
      ),
    );

    await chooseOption(canvas.getByLabelText("Kind"), "Transfer");
    await waitFor(() => expect(canvas.getAllByRole("listitem")).toHaveLength(2));
    await expect(canvas.getByText(/restored Pervedimas į santaupas/u)).toBeVisible();
    await expect(canvas.getByText(/deleted Pervedimas į santaupas/u)).toBeVisible();

    await chooseOption(canvas.getByLabelText("Kind"), "Household");
    await expect(await canvas.findByText("No activity matches these filters.")).toBeVisible();
  },
};
