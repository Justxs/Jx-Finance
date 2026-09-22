import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import {
  getRemoveMemberMockHandler,
  getUpdateHouseholdMockHandler,
} from "@/api/generated/households/households.msw";
import { withWidth } from "@/storybook/decorators";
import { familyHousehold, gardenHousehold, householdMembers } from "@/storybook/fixtures";
import { pending, withHandlers } from "@/storybook/handlers";
import { HouseholdCard } from "./household-card";

const meta = {
  title: "Features/Households/HouseholdCard",
  component: HouseholdCard,
  parameters: { route: "/households" },
  args: { household: familyHousehold },
  decorators: [withWidth("w-[40rem] max-w-full")],
} satisfies Meta<typeof HouseholdCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OwnerView: Story = {};

export const MemberView: Story = { args: { household: gardenHousehold } };

export const LongNameOwnerView: Story = {
  args: { household: { ...gardenHousehold, myRole: "owner" } },
};

export const SoleOwner: Story = {
  args: { household: { ...familyHousehold, members: [householdMembers[0]!] } },
};

export const NoMembers: Story = { args: { household: { ...familyHousehold, members: [] } } };

export const ManyMembers: Story = {
  args: {
    household: {
      ...familyHousehold,
      members: Array.from({ length: 12 }, (_, index) => ({
        userId: `member-${index}`,
        email: `narys${index + 1}@example.lt`,
        displayName: `Household member ${index + 1}`,
        role: index === 0 ? ("owner" as const) : ("member" as const),
      })),
    },
  },
};

export const NarrowOwnerView: Story = {
  args: { household: { ...gardenHousehold, myRole: "owner" } },
  decorators: [withWidth("card")],
};

export const SlowMutations: Story = {
  parameters: withHandlers(
    getRemoveMemberMockHandler(pending),
    getUpdateHouseholdMockHandler(pending),
  ),
};

export const DeleteOffersUndo: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: /^(delete|ištrinti): kazlauskų šeima$/i }),
    );
    const page = within(document.body);
    const dialog = await page.findByRole("alertdialog");
    await expect(
      within(dialog).getByText(/you can undo this straight away|veiksmą galėsite atšaukti/i),
    ).toBeVisible();
    await userEvent.click(within(dialog).getByRole("button", { name: /delete|ištrinti/i }));

    const undo = await page.findByRole("button", { name: /^(undo|atšaukti)$/i });
    await userEvent.click(undo);

    await expect(await page.findByText(/brought back|įrašas grąžintas/i)).toBeInTheDocument();
  },
};

export const OpensActivity: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole("button", { name: "Show activity" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(toggle);

    await expect(canvas.getByRole("button", { name: "Hide activity" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await expect(await canvas.findByText(/changed Maxima, 42.18 EUR/u)).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Activity" })).toBeVisible();
  },
};
