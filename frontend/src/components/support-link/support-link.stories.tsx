import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor } from "storybook/test";
import { savePreferences } from "@/stores/preferences";
import { withWidth } from "@/storybook/decorators";
import { SUPPORT_URL, SupportLink, SupportLinkSetting } from "./support-link";

const meta = {
  title: "Components/SupportLink",
  component: SupportLink,
  decorators: [withWidth("narrow")],
  beforeEach: () => {
    savePreferences({ supportLinkHidden: false });
  },
} satisfies Meta<typeof SupportLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "Support on Ko-fi" })).toHaveAttribute(
      "href",
      SUPPORT_URL,
    );
  },
};

export const Collapsed: Story = { args: { collapsed: true } };

export const Hidden: Story = {
  beforeEach: () => {
    savePreferences({ supportLinkHidden: true });
  },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("link")).toBeNull();
  },
};

export const Setting: Story = {
  decorators: [withWidth("panel")],
  render: () => (
    <>
      <SupportLinkSetting />
      <SupportLink />
    </>
  ),
  play: async ({ canvas }) => {
    const toggle = canvas.getByRole("checkbox", { name: /Show the Ko-fi link/u });
    await expect(toggle).toBeChecked();
    await userEvent.click(toggle);
    await waitFor(() => expect(canvas.getAllByRole("link")).toHaveLength(1));
  },
};
