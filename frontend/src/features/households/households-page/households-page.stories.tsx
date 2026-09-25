import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, screen, userEvent, waitFor, within } from "storybook/test";
import {
  getCreateHouseholdMockHandler,
  getHouseholdsMockHandler,
} from "@/api/generated/households/households.msw";
import type { HouseholdResponse } from "@/api/generated/model";
import { withPageFrame } from "@/storybook/decorators";
import {
  familyHousehold,
  gardenHousehold,
  households,
  serverErrorProblem,
} from "@/storybook/fixtures";
import {
  emptyHandlers,
  errorHandlers,
  failWith,
  handlers,
  loadingHandlers,
  withHandlers,
} from "@/storybook/handlers";
import { openedDialog } from "@/storybook/interactions";
import { HouseholdsPage } from "./households-page";

const meta = {
  title: "Features/Households/HouseholdsPage",
  component: HouseholdsPage,
  parameters: { layout: "fullscreen", route: "/households" },
  decorators: [withPageFrame],
} satisfies Meta<typeof HouseholdsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const OwnerOnly: Story = {
  parameters: withHandlers(getHouseholdsMockHandler([familyHousehold])),
};

export const MemberOnly: Story = {
  parameters: withHandlers(getHouseholdsMockHandler([gardenHousehold])),
};

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

function createdHouseholdHandlers() {
  const created: HouseholdResponse[] = [];
  return [
    getHouseholdsMockHandler(() => [...households, ...created]),
    getCreateHouseholdMockHandler(async ({ request }) => {
      const body: unknown = await request.json();
      const name =
        typeof body === "object" && body !== null && "name" in body ? String(body.name) : "";
      const household: HouseholdResponse = {
        id: "00000000-0000-4000-8000-0000000000aa",
        name,
        myRole: "owner",
        members: familyHousehold.members.slice(0, 1),
      };
      created.push(household);
      return household;
    }),
    ...handlers,
  ];
}

export const CreatesHousehold: Story = {
  parameters: { msw: { handlers: createdHouseholdHandlers() } },
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("button", { name: /create household|sukurti namų ūkį/i }),
    );
    const dialog = await openedDialog();
    await fireEvent.change(within(dialog).getByRole("textbox"), {
      target: { value: "Summer house" },
    });
    await userEvent.click(
      within(dialog).getByRole("button", { name: /create household|sukurti namų ūkį/i }),
    );

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await expect(await canvas.findByText("Summer house")).toBeVisible();
  },
};

export const CreateFails: Story = {
  parameters: withHandlers(getCreateHouseholdMockHandler(failWith(serverErrorProblem))),
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("button", { name: /create household|sukurti namų ūkį/i }),
    );
    const dialog = await openedDialog();
    await fireEvent.change(within(dialog).getByRole("textbox"), {
      target: { value: "Kazlauskų šeima" },
    });
    await userEvent.click(
      within(dialog).getByRole("button", { name: /create household|sukurti namų ūkį/i }),
    );

    await expect(await within(dialog).findByRole("alert")).toBeVisible();
    await expect(dialog).toBeVisible();
  },
};
