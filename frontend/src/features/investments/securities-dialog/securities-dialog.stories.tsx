import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, screen, userEvent, waitFor } from "storybook/test";
import { errorHandlers, investmentsEmptyHandlers } from "@/storybook/handlers";
import { SecuritiesDialog } from "./securities-dialog";

const meta = {
  title: "Features/Investments/SecuritiesDialog",
  component: SecuritiesDialog,
  parameters: { layout: "fullscreen" },
  args: { open: true, onOpenChange: fn() },
} satisfies Meta<typeof SecuritiesDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { parameters: { msw: { handlers: investmentsEmptyHandlers } } };

export const LoadError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const Lithuanian: Story = { globals: { locale: "lt" } };

export const Search: Story = {
  play: async () => {
    await expect(await screen.findByText("MSFT")).toBeInTheDocument();
    await userEvent.type(screen.getByRole("searchbox"), "vanguard");
    await waitFor(() => expect(screen.queryByText("MSFT")).not.toBeInTheDocument());
    await expect(screen.getByText("VWCE")).toBeInTheDocument();
  },
};

export const EditSecurity: Story = {
  play: async () => {
    await userEvent.click(await screen.findByRole("button", { name: "Edit: MSFT" }));
    await expect(await screen.findByLabelText("Symbol")).toHaveValue("MSFT");
  },
};
