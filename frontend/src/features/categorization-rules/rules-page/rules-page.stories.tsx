import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import {
  getCategorizationRulesMockHandler,
  getDeleteCategorizationRuleMockHandler,
  getMoveCategorizationRuleMockHandler,
} from "@/api/generated/categorization-rules/categorization-rules.msw";
import { withPageFrame } from "@/storybook/decorators";
import { categorizationRules } from "@/storybook/fixtures";
import {
  emptyHandlers,
  errorHandlers,
  loadingHandlers,
  pending,
  withHandlers,
} from "@/storybook/handlers";
import { openedDialog } from "@/storybook/interactions";
import { RulesPage } from "./rules-page";

const meta = {
  title: "Features/CategorizationRules/RulesPage",
  component: RulesPage,
  parameters: { layout: "fullscreen", route: "/categorization-rules" },
  decorators: [withPageFrame],
} satisfies Meta<typeof RulesPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(categorizationRules[0]!.name)).toBeInTheDocument();
    await expect(await canvas.findByText(categorizationRules[4]!.name)).toBeInTheDocument();
  },
};

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const SingleRule: Story = {
  parameters: withHandlers(getCategorizationRulesMockHandler(categorizationRules.slice(0, 1))),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const up = await canvas.findByRole("button", { name: /^(move up|pakelti):/i });
    const down = await canvas.findByRole("button", { name: /^(move down|nuleisti):/i });
    await expect(up).toBeDisabled();
    await expect(down).toBeDisabled();
  },
};

export const ReorderFirstRuleDown: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const down = await canvas.findAllByRole("button", { name: /^(move down|nuleisti):/i });
    await userEvent.click(down[0]!);
    await expect(
      await canvas.findByText(categorizationRules[1]!.name, { exact: false }),
    ).toBeInTheDocument();
  },
};

export const ReorderPending: Story = {
  parameters: withHandlers(getMoveCategorizationRuleMockHandler(pending)),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const down = await canvas.findAllByRole("button", { name: /^(move down|nuleisti):/i });
    await userEvent.click(down[0]!);
  },
};

export const AddDialogOpen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: /add rule|pridėti taisyklę/i }),
    );
    const dialog = await openedDialog();
    await expect(within(dialog).getByLabelText(/^(name|pavadinimas)$/i)).toBeInTheDocument();
  },
};

export const RunDialogOpen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", {
        name: /run over existing transactions|paleisti esamoms operacijoms/i,
      }),
    );
    const dialog = await openedDialog();
    await expect(
      within(dialog).getByRole("checkbox", {
        name: /also replace categories|taip pat pakeisti/i,
      }),
    ).not.toBeChecked();
  },
};

export const DeleteOffersUndo: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const deleteButtons = await canvas.findAllByRole("button", {
      name: /^(delete|ištrinti):/i,
    });
    await userEvent.click(deleteButtons[0]!);
    const dialog = await openedDialog("alertdialog");
    const page = within(document.body);
    await expect(
      within(dialog).getByText(/you can undo this straight away|veiksmą galėsite atšaukti/i),
    ).toBeVisible();
    await userEvent.click(within(dialog).getByRole("button", { name: /delete|ištrinti/i }));

    const undo = await page.findByRole("button", { name: /^(undo|atšaukti)$/i });
    await userEvent.click(undo);

    await expect(await page.findByText(/brought back|įrašas grąžintas/i)).toBeInTheDocument();
  },
};

export const DeletePending: Story = {
  parameters: withHandlers(getDeleteCategorizationRuleMockHandler(pending)),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const deleteButtons = await canvas.findAllByRole("button", {
      name: /^(delete|ištrinti):/i,
    });
    await userEvent.click(deleteButtons[0]!);
    const dialog = await openedDialog("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: /delete|ištrinti/i }));
  },
};
