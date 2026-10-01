import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, userEvent, waitFor } from "storybook/test";
import { getCreateContactSplitMockHandler } from "@/api/generated/contacts/contacts.msw";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Card } from "@/components/ui/card/card";
import {
  alreadySplitProblem,
  contactSplitPurchase,
  currentUser,
  sharedPurchase,
} from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { ContactSplitForm } from "./contact-split-form";

const purchase = { ...sharedPurchase, sharedExpense: null };

const meta = {
  title: "Features/Households/ContactSplitForm",
  component: ContactSplitForm,
  parameters: { route: "/transactions" },
  args: { transaction: purchase, onClose: fn() },
  render: (args) => (
    <Card className="w-[36rem] max-w-full p-6">
      <QueryBoundary fallback={null}>
        <ContactSplitForm {...args} />
      </QueryBoundary>
    </Card>
  ),
} satisfies Meta<typeof ContactSplitForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvas }) => {
    await expect(await canvas.findByText(`${currentUser.displayName} pays €90.00`)).toBeVisible();
    await userEvent.click(canvas.getByRole("checkbox", { name: "Jonas takes part" }));
    await expect(await canvas.findByText("Jonas pays €45.00")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(args.onClose).toHaveBeenCalled());
  },
};

export const LentInFull: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("checkbox", { name: `${currentUser.displayName} takes part` }),
    );
    await userEvent.click(canvas.getByRole("checkbox", { name: "Ona takes part" }));
    await expect(await canvas.findByText("Ona pays €90.00")).toBeVisible();
  },
};

export const ByShares: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("checkbox", { name: "Jonas takes part" }));
    await userEvent.click(canvas.getByRole("radio", { name: "By shares" }));
    await fireEvent.change(canvas.getByRole("textbox", { name: "Shares of Jonas" }), {
      target: { value: "2" },
    });
    await expect(await canvas.findByText("Jonas pays €60.00")).toBeVisible();
    await expect(canvas.getByText(`${currentUser.displayName} pays €30.00`)).toBeVisible();
  },
};

export const NobodyChosen: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Save" }));
    await expect(await canvas.findByText("Choose at least one person.")).toBeVisible();
  },
};

export const EditExisting: Story = {
  args: { transaction: contactSplitPurchase },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("checkbox", { name: "Ona takes part" })).toBeChecked();
    await expect(canvas.getByRole("checkbox", { name: "Tomas takes part" })).not.toBeChecked();
    await expect(canvas.getByText("Jonas pays €30.00")).toBeVisible();
  },
};

export const AlreadySplit: Story = {
  parameters: withHandlers(getCreateContactSplitMockHandler(failWith(alreadySplitProblem))),
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("checkbox", { name: "Jonas takes part" }));
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "This expense is already split.",
    );
  },
};

export const Saving: Story = {
  parameters: withHandlers(getCreateContactSplitMockHandler(pending)),
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("checkbox", { name: "Jonas takes part" }));
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: /save/i })).toHaveAttribute("aria-busy", "true"),
    );
  },
};

export const Lithuanian: Story = { globals: { locale: "lt" } };
