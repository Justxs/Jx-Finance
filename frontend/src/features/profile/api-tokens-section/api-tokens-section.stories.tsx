import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, screen, userEvent, waitFor, within } from "storybook/test";
import {
  getCreatePersonalApiTokenMockHandler,
  getPersonalApiTokensMockHandler,
  getRevokePersonalApiTokenMockHandler,
} from "@/api/generated/auth/auth.msw";
import type { PersonalApiTokenResponse } from "@/api/generated/model";
import {
  createdPersonalApiToken,
  personalApiTokens,
  serverErrorProblem,
  tokenLimitReachedProblem,
} from "@/storybook/fixtures";
import { failWith, handlers, pending, withHandlers } from "@/storybook/handlers";
import { readBody, text } from "@/storybook/handlers/http";
import { type Canvas, chooseOption, openedDialog } from "@/storybook/interactions";
import { ApiTokensSection } from "./api-tokens-section";

const meta = {
  title: "Features/Profile/ApiTokensSection",
  component: ApiTokensSection,
  parameters: { layout: "padded", route: "/profile?section=security" },
} satisfies Meta<typeof ApiTokensSection>;

export default meta;
type Story = StoryObj<typeof meta>;

function editableHandlers() {
  let live: PersonalApiTokenResponse[] = personalApiTokens;
  return [
    getPersonalApiTokensMockHandler(() => live),
    getCreatePersonalApiTokenMockHandler(async ({ request }) => {
      const body = await readBody(request);
      const created = { ...createdPersonalApiToken, name: text(body.name) ?? "" };
      const access = text(body.access) === "readWrite" ? "readWrite" : "read";
      live = [{ ...created, access, lastUsedAt: null, isExpired: false }, ...live];
      return created;
    }),
    getRevokePersonalApiTokenMockHandler(({ params }) => {
      live = live.filter((token) => token.id !== params.id);
    }),
    ...handlers,
  ];
}

async function fillCreateForm(canvas: Canvas) {
  await userEvent.click(await canvas.findByRole("button", { name: "Create a token" }));
  const dialog = within(await openedDialog("dialog"));
  await fireEvent.change(dialog.getByLabelText("Name"), { target: { value: "Power Query" } });
  await fireEvent.change(dialog.getByLabelText("Current password"), {
    target: { value: "correct horse" },
  });
  await userEvent.click(dialog.getByRole("button", { name: "Create a token" }));
  return dialog;
}

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Monthly spreadsheet")).toBeVisible();
    await expect(canvas.getByText("jxp_4fK2aQ9m…")).toBeVisible();
    await expect(canvas.getByText("Old budget script")).toBeVisible();
    await expect(canvas.getByText("Expired", { selector: "span" })).toBeVisible();
    await expect(canvas.getByText("Never")).toBeVisible();
    await expect(canvas.getByText("Home Assistant")).toBeVisible();
    await expect(canvas.getAllByText("Read and write", { selector: "span" })).toHaveLength(1);
    await expect(canvas.getAllByText("Read only", { selector: "span" })).toHaveLength(2);
  },
};

export const Dark: Story = { globals: { theme: "dark" } };

export const Lithuanian: Story = {
  globals: { locale: "lt" },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Nebegalioja")).toBeVisible();
  },
};

export const Empty: Story = {
  parameters: withHandlers(getPersonalApiTokensMockHandler([])),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("No tokens yet.")).toBeVisible();
  },
};

export const Loading: Story = {
  parameters: withHandlers(getPersonalApiTokensMockHandler(pending)),
};

export const LoadFailed: Story = {
  parameters: withHandlers(
    getPersonalApiTokensMockHandler(
      failWith({ ...serverErrorProblem, instance: "/api/auth/tokens" }),
    ),
  ),
};

export const CreatesAToken: Story = {
  parameters: { msw: { handlers: editableHandlers() } },
  play: async ({ canvas }) => {
    const dialog = await fillCreateForm(canvas);

    await expect(await dialog.findByLabelText("Your new token")).toHaveValue(
      createdPersonalApiToken.token,
    );
    await expect(dialog.getByText(/You will not see this token again/u)).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Copy" })).toBeVisible();
    await expect(dialog.queryByText(/can also add, change and delete/u)).toBeNull();
    await userEvent.click(dialog.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByLabelText("Your new token")).toBeNull());
    await waitFor(() =>
      expect(canvas.getAllByRole("button", { name: /^Revoke:/u })).toHaveLength(4),
    );
    await expect(canvas.getByText("Power Query")).toBeVisible();
  },
};

export const ReadAndWrite: Story = {
  parameters: { msw: { handlers: editableHandlers() } },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Create a token" }));
    const dialog = within(await openedDialog("dialog"));
    const expiry = dialog.getByLabelText("Expires after");
    await chooseOption(expiry, "1 year");
    await expect(expiry).toHaveTextContent("1 year");

    await userEvent.click(dialog.getByRole("radio", { name: "Read and write" }));

    await waitFor(() => expect(expiry).toHaveTextContent("90 days"));
    await userEvent.click(expiry);
    await expect(await screen.findByRole("option", { name: "30 days" })).toBeInTheDocument();
    await expect(screen.queryByRole("option", { name: "1 year" })).toBeNull();
    await userEvent.click(screen.getByRole("option", { name: "90 days" }));
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());

    await fireEvent.change(dialog.getByLabelText("Name"), { target: { value: "Home Assistant" } });
    await fireEvent.change(dialog.getByLabelText("Current password"), {
      target: { value: "correct horse" },
    });
    await userEvent.click(dialog.getByRole("button", { name: "Create a token" }));

    await expect(await dialog.findByText(/can also add, change and delete/u)).toBeVisible();
    await userEvent.click(dialog.getByRole("button", { name: "Done" }));
    await waitFor(() =>
      expect(canvas.getAllByText("Read and write", { selector: "span" })).toHaveLength(2),
    );
  },
};

export const LimitReached: Story = {
  parameters: withHandlers(
    getCreatePersonalApiTokenMockHandler(failWith(tokenLimitReachedProblem)),
  ),
  play: async ({ canvas }) => {
    const dialog = await fillCreateForm(canvas);

    await expect(await dialog.findByRole("alert")).toHaveTextContent(
      "You already have 10 tokens. Revoke one first.",
    );
  },
};

export const Revokes: Story = {
  parameters: { msw: { handlers: editableHandlers() } },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Revoke: Old budget script" }));
    const confirm = within(await openedDialog("alertdialog"));
    await expect(confirm.getByText("Revoke this token?")).toBeVisible();
    await userEvent.click(confirm.getByRole("button", { name: "Revoke" }));

    await expect(await screen.findByText("Token revoked")).toBeInTheDocument();
    await waitFor(() => expect(canvas.queryByText("Old budget script")).toBeNull());
  },
};
