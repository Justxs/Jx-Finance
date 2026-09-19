import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
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
    const body = within(document.body);
    await expect(await body.findByText("MSFT")).toBeInTheDocument();
    await userEvent.type(body.getByRole("searchbox"), "vanguard");
    await waitFor(() => expect(body.queryByText("MSFT")).not.toBeInTheDocument());
    await expect(body.getByText("VWCE")).toBeInTheDocument();
  },
};

export const EditSecurity: Story = {
  play: async () => {
    const body = within(document.body);
    await userEvent.click(await body.findByRole("button", { name: "Edit: MSFT" }));
    await expect(await body.findByLabelText("Symbol")).toHaveValue("MSFT");
  },
};
