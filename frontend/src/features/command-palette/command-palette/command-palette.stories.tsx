import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, screen, waitFor, within } from "storybook/test";
import { getMeMockHandler } from "@/api/generated/auth/auth.msw";
import { getSettingsMockHandler } from "@/api/generated/settings/settings.msw";
import { rememberCommand, setCommandPaletteOpen } from "@/stores/command-palette-store";
import { memberUser, settings } from "@/storybook/fixtures";
import { handlers } from "@/storybook/handlers";
import { openedDialog } from "@/storybook/interactions";
import { CommandPalette } from "./command-palette";

const memberHandlers = [
  getMeMockHandler(memberUser),
  getSettingsMockHandler({
    ...settings,
    features: { ...settings.features, investments: false, categorizationRules: false },
  }),
  ...handlers,
];

async function searchBox() {
  const dialog = await openedDialog();
  return within(dialog).getByRole("combobox", { name: "Search pages, records and actions" });
}

async function type(value: string) {
  const input = await searchBox();
  await fireEvent.change(input, { target: { value } });
  return input;
}

async function optionNames() {
  const dialog = await openedDialog();
  return within(dialog)
    .getAllByRole("option")
    .map((option) => option.textContent ?? "");
}

const meta = {
  title: "Features/CommandPalette/CommandPalette",
  component: CommandPalette,
  parameters: { layout: "fullscreen" },
  beforeEach: () => {
    setCommandPaletteOpen(true);
    return () => setCommandPaletteOpen(false);
  },
} satisfies Meta<typeof CommandPalette>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  play: async () => {
    const input = await searchBox();
    await expect(input).toHaveAttribute("aria-expanded", "true");

    const dialog = await openedDialog();
    const listbox = within(dialog).getByRole("listbox", { name: "Matches" });
    await expect(listbox).toHaveAttribute("id", input.getAttribute("aria-controls"));

    const names = await optionNames();
    await expect(names.some((name) => name.includes("New transaction"))).toBe(true);
    await expect(names.some((name) => name.includes("Tags"))).toBe(true);
  },
};

export const Filtering: Story = {
  play: async () => {
    await type("kavines");

    const names = await optionNames();
    await expect(names.some((name) => name.includes("Kavinės ir restoranai"))).toBe(true);
    await expect(names.some((name) => name.includes("New transaction"))).toBe(false);
  },
};

export const KeyboardChoice: Story = {
  play: async () => {
    const input = await type("tags");
    const dialog = await openedDialog();
    const [first, second] = within(dialog).getAllByRole("option");

    await expect(input).toHaveAttribute("aria-activedescendant", first?.id);
    await fireEvent.keyDown(input, { key: "ArrowDown" });
    await expect(input).toHaveAttribute("aria-activedescendant", second?.id);
    await fireEvent.keyDown(input, { key: "ArrowUp" });
    await expect(input).toHaveAttribute("aria-activedescendant", first?.id);

    await fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  },
};

export const Empty: Story = {
  play: async () => {
    const input = await type("qqqjjj");

    await expect(input).toHaveAttribute("aria-expanded", "false");
    await expect(screen.queryByRole("listbox")).toBeNull();
    await screen.findByText("Nothing matches what you typed.");
  },
};

export const AdministratorOnlyEntries: Story = {
  play: async () => {
    await type("email");
    await expect((await optionNames()).some((name) => name.includes("Email"))).toBe(true);

    await type("back up");
    await expect((await optionNames()).some((name) => name.includes("Back up now"))).toBe(true);
  },
};

export const MemberWithoutSomeFeatures: Story = {
  parameters: { msw: { handlers: memberHandlers } },
  play: async () => {
    const dialog = await openedDialog();
    await waitFor(async () =>
      expect((await optionNames()).some((name) => name.includes("Dashboard"))).toBe(true),
    );

    const names = await optionNames();
    await expect(names.some((name) => name.includes("Users"))).toBe(false);
    await expect(names.some((name) => name.includes("Back up now"))).toBe(false);
    await expect(names.some((name) => name.includes("Investment tax summary"))).toBe(false);
    await expect(within(dialog).getAllByRole("option").length).toBeGreaterThan(5);
  },
};

export const RecentsFirst: Story = {
  beforeEach: () => {
    setCommandPaletteOpen(true);
    rememberCommand("page-tags");
    rememberCommand("page-trash");
    return () => setCommandPaletteOpen(false);
  },
  play: async () => {
    const names = await optionNames();

    await expect(names[0]).toContain("Trash");
    await expect(names[1]).toContain("Tags");
  },
};

export const Lithuanian: Story = {
  globals: { locale: "lt" },
  play: async () => {
    const dialog = await openedDialog();
    await within(dialog).findByRole("combobox", { name: "Ieškoti puslapių, įrašų ir veiksmų" });
  },
};
