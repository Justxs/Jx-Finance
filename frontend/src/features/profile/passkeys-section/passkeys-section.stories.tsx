import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, screen, userEvent, waitFor, within } from "storybook/test";
import {
  getAddPasskeyMockHandler,
  getBeginPasskeyRegistrationMockHandler,
  getPasskeysMockHandler,
  getRemovePasskeyMockHandler,
  getRenamePasskeyMockHandler,
} from "@/api/generated/auth/auth.msw";
import type { PasskeyResponse } from "@/api/generated/model";
import {
  passkeyLimitReachedProblem,
  passkeyOptions,
  passkeys,
  serverErrorProblem,
} from "@/storybook/fixtures";
import {
  failWith,
  handlers,
  passkeysOffHandler,
  pending,
  withHandlers,
} from "@/storybook/handlers";
import { found, readBody, text } from "@/storybook/handlers/http";
import { type Canvas, openedDialog } from "@/storybook/interactions";
import { browserWithoutPasskeys, fakePasskeyBrowser } from "@/storybook/passkeys";
import { PasskeysSection } from "./passkeys-section";

const meta = {
  title: "Features/Profile/PasskeysSection",
  component: PasskeysSection,
  parameters: { layout: "padded", route: "/profile?section=security" },
  beforeEach: fakePasskeyBrowser(),
} satisfies Meta<typeof PasskeysSection>;

export default meta;
type Story = StoryObj<typeof meta>;

function editableHandlers() {
  let live: PasskeyResponse[] = passkeys;
  return [
    getPasskeysMockHandler(() => live),
    getBeginPasskeyRegistrationMockHandler(passkeyOptions),
    getAddPasskeyMockHandler(async ({ request }) => {
      const added = {
        id: "bmV3LXBhc3NrZXk",
        name: text((await readBody(request)).name) ?? "",
        createdAt: "2026-09-20T09:15:00Z",
        isSynced: true,
      };
      live = [...live, added];
      return added;
    }),
    getRenamePasskeyMockHandler(async ({ request, params }) => {
      const name = text((await readBody(request)).name) ?? "";
      live = live.map((passkey) => (passkey.id === params.id ? { ...passkey, name } : passkey));
      return found(live.find((passkey) => passkey.id === params.id));
    }),
    getRemovePasskeyMockHandler(({ params }) => {
      live = live.filter((passkey) => passkey.id !== params.id);
    }),
    ...handlers,
  ];
}

async function submitPassword(canvas: Canvas) {
  await fireEvent.change(await canvas.findByLabelText("Current password"), {
    target: { value: "correct horse" },
  });
  await userEvent.click(canvas.getByRole("button", { name: "Add a passkey" }));
}

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Chrome 140 on Windows")).toBeVisible();
    await expect(canvas.getByText("Synced across devices")).toBeVisible();
    await expect(canvas.getByText("YubiKey 5C")).toBeVisible();
    await expect(canvas.getByText("This device only")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Add a passkey" })).toBeDisabled();
  },
};

export const Dark: Story = { globals: { theme: "dark" } };

export const Lithuanian: Story = {
  globals: { locale: "lt" },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Tik šiame įrenginyje")).toBeVisible();
  },
};

export const Empty: Story = {
  parameters: withHandlers(getPasskeysMockHandler([])),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("No passkeys yet.")).toBeVisible();
  },
};

export const Loading: Story = {
  parameters: withHandlers(getPasskeysMockHandler(pending)),
};

export const LoadFailed: Story = {
  parameters: withHandlers(
    getPasskeysMockHandler(failWith({ ...serverErrorProblem, instance: "/api/auth/passkeys" })),
  ),
};

export const UnsupportedBrowser: Story = {
  beforeEach: browserWithoutPasskeys,
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/This browser cannot create passkeys/u)).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Add a passkey" })).toBeNull();
    await expect(await canvas.findByText("YubiKey 5C")).toBeVisible();
  },
};

export const UnavailableInstallation: Story = {
  parameters: withHandlers(passkeysOffHandler),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText(/need this installation to be opened over HTTPS/u),
    ).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Add a passkey" })).toBeNull();
  },
};

export const AddsAPasskey: Story = {
  parameters: { msw: { handlers: editableHandlers() } },
  play: async ({ canvas }) => {
    await submitPassword(canvas);

    await expect(await screen.findByText("Passkey added")).toBeInTheDocument();
    await waitFor(() => expect(canvas.getAllByRole("button", { name: /^Edit:/u })).toHaveLength(3));
    await expect(canvas.getByLabelText("Current password")).toHaveValue("");
  },
};

export const AlreadyOnThisAuthenticator: Story = {
  beforeEach: fakePasskeyBrowser("alreadyRegistered"),
  play: async ({ canvas }) => {
    await submitPassword(canvas);

    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "This authenticator already holds a passkey for your account.",
    );
  },
};

export const CancelledQuietly: Story = {
  beforeEach: fakePasskeyBrowser("cancelled"),
  play: async ({ canvas }) => {
    await submitPassword(canvas);

    await waitFor(() => expect(canvas.getByLabelText("Current password")).toHaveValue(""));
    await expect(canvas.queryByRole("alert")).toBeNull();
  },
};

export const LimitReached: Story = {
  parameters: withHandlers(
    getBeginPasskeyRegistrationMockHandler(failWith(passkeyLimitReachedProblem)),
  ),
  play: async ({ canvas }) => {
    await submitPassword(canvas);

    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "You already have 10 passkeys. Remove one first.",
    );
  },
};

export const RenamesAndRemoves: Story = {
  parameters: { msw: { handlers: editableHandlers() } },
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("button", { name: "Edit: Chrome 140 on Windows" }),
    );
    const renameDialog = within(await openedDialog("dialog"));
    await expect(renameDialog.getByLabelText("Name")).toHaveValue("Chrome 140 on Windows");
    await fireEvent.change(renameDialog.getByLabelText("Name"), {
      target: { value: "Work laptop" },
    });
    await userEvent.click(renameDialog.getByRole("button", { name: "Save" }));
    await expect(await canvas.findByText("Work laptop")).toBeVisible();

    await userEvent.click(canvas.getByRole("button", { name: "Delete: YubiKey 5C" }));
    const confirm = within(await openedDialog("alertdialog"));
    await expect(confirm.getByText("Remove this passkey?")).toBeVisible();
    await expect(confirm.getByText("YubiKey 5C")).toBeVisible();
    await userEvent.click(confirm.getByRole("button", { name: "Remove" }));

    await expect(await screen.findByText("Passkey removed")).toBeInTheDocument();
    await waitFor(() => expect(canvas.queryByText("YubiKey 5C")).toBeNull());
    await expect(canvas.getByRole("link", { name: "Signed-in browsers" })).toHaveAttribute(
      "href",
      "/profile?section=sessions",
    );
  },
};
