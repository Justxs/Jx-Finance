import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";
import { getGettingStartedMockHandler } from "@/api/generated/dashboard/dashboard.msw";
import { withWidth } from "@/storybook/decorators";
import { gettingStartedDone, gettingStartedFresh } from "@/storybook/fixtures";
import { loadingHandlers, withHandlers } from "@/storybook/handlers";
import { GettingStartedCard } from "./getting-started-card";

const meta = {
  title: "Features/Dashboard/GettingStartedCard",
  component: GettingStartedCard,
  decorators: [withWidth("wide")],
} satisfies Meta<typeof GettingStartedCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/^(5 of 10 done|atlikta 5 iš 10)$/iu)).toBeVisible();
    await expect(canvas.queryByRole("link")).toBeNull();
    await expect(
      canvas.getByRole("button", { name: /^(show steps|rodyti žingsnius)$/iu }),
    ).toHaveAttribute("aria-expanded", "false");
    await expect(
      canvas.getByRole("button", { name: /^(hide card|slėpti kortelę)$/iu }),
    ).toBeVisible();
  },
};

export const StepsShown: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("button", { name: /^(show steps|rodyti žingsnius)$/iu }),
    );
    await expect(canvas.getByRole("link", { name: /^(take a backup|padarykite)/iu })).toBeVisible();
    await expect(
      canvas.queryByRole("link", { name: /^(add an account|pridėkite sąskaitą)$/iu }),
    ).toBeNull();
  },
};

export const Fresh: Story = {
  parameters: withHandlers(getGettingStartedMockHandler(gettingStartedFresh)),
  play: async ({ canvas }) => {
    await expect(await canvas.findAllByRole("link")).toHaveLength(gettingStartedFresh.length);
    await expect(
      canvas.queryByRole("button", { name: /^(show steps|rodyti žingsnius)$/iu }),
    ).toBeNull();
  },
};

export const AllDone: Story = {
  parameters: withHandlers(getGettingStartedMockHandler(gettingStartedDone)),
};

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };
