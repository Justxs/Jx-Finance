import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, userEvent, waitFor } from "storybook/test";
import {
  getCreateCategorizationRuleMockHandler,
  getTestCategorizationRuleMockHandler,
} from "@/api/generated/categorization-rules/categorization-rules.msw";
import {
  accounts,
  categories,
  categorizationRules,
  ruleTestAmountOnly,
  ruleTestNoMatch,
  tags,
} from "@/storybook/fixtures";
import { errorHandlers, failWithStatus, pending, withHandlers } from "@/storybook/handlers";
import { RuleForm } from "./rule-form";

const meta = {
  title: "Features/CategorizationRules/RuleForm",
  component: RuleForm,
  args: {
    accounts,
    categories,
    tags,
    onClose: fn(),
  },
  render: (args) => (
    <div className="w-[min(40rem,calc(100vw-3rem))]">
      <RuleForm {...args} />
    </div>
  ),
} satisfies Meta<typeof RuleForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Editing: Story = { args: { initial: categorizationRules[1] } };

export const TagOnlyRule: Story = { args: { initial: categorizationRules[4] } };

export const NoTagsYet: Story = { args: { tags: [] } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const NameIsRequired: Story = {
  play: async ({ canvas }) => {
    const name = await canvas.findByLabelText(/^(name|pavadinimas)$/i);
    await userEvent.type(name, "x");
    await userEvent.clear(name);
    await waitFor(() => expect(name).toHaveAttribute("aria-invalid", "true"));
  },
};

export const SampleMatches: Story = {
  args: { initial: categorizationRules[0] },
  play: async ({ canvas }) => {
    await fireEvent.change(
      await canvas.findByLabelText(/sample description|pavyzdinis paaiškinimas/i),
      { target: { value: "Pirkinys MAXIMA X-123" } },
    );
    await userEvent.click(canvas.getByRole("button", { name: /^(try it|išbandyti)$/i }));
    await expect(
      await canvas.findByText(/would set|nustatytų/i, { selector: "p" }),
    ).toBeInTheDocument();
  },
};

export const SampleDoesNotMatch: Story = {
  args: { initial: categorizationRules[0] },
  parameters: withHandlers(getTestCategorizationRuleMockHandler(ruleTestNoMatch)),
  play: async ({ canvas }) => {
    await fireEvent.change(
      await canvas.findByLabelText(/sample description|pavyzdinis paaiškinimas/i),
      { target: { value: "LIDL ZIRMUNU" } },
    );
    await userEvent.click(canvas.getByRole("button", { name: /^(try it|išbandyti)$/i }));
    await expect(
      await canvas.findByText(/would not match|nesutaptų/i, { selector: "p" }),
    ).toBeInTheDocument();
  },
};

export const SampleFailsOnTheAmount: Story = {
  args: { initial: categorizationRules[1] },
  parameters: withHandlers(getTestCategorizationRuleMockHandler(ruleTestAmountOnly)),
  play: async ({ canvas }) => {
    await fireEvent.change(
      await canvas.findByLabelText(/sample description|pavyzdinis paaiškinimas/i),
      { target: { value: "TRAFI bilietas" } },
    );
    await fireEvent.change(await canvas.findByLabelText(/sample amount|pavyzdinė suma/i), {
      target: { value: "90.00" },
    });
    await userEvent.click(canvas.getByRole("button", { name: /^(try it|išbandyti)$/i }));
    await expect(
      await canvas.findByText(/outside the range|nepatenka į rėžį/i, { selector: "p" }),
    ).toBeInTheDocument();
  },
};

export const SubmitPending: Story = {
  parameters: withHandlers(getCreateCategorizationRuleMockHandler(pending)),
  play: async ({ canvas }) => {
    await fireEvent.change(await canvas.findByLabelText(/^(name|pavadinimas)$/i), {
      target: { value: "Parduotuvės" },
    });
    await fireEvent.change(await canvas.findByLabelText(/^(text|tekstas)$/i), {
      target: { value: "MAXIMA" },
    });
    await userEvent.click(canvas.getByRole("checkbox", { name: tags[0]!.name }));
    await userEvent.click(canvas.getByRole("button", { name: /^(add|pridėti)$/i }));
  },
};

export const SubmitFails: Story = {
  parameters: withHandlers(getCreateCategorizationRuleMockHandler(failWithStatus(500))),
  play: async ({ canvas }) => {
    await fireEvent.change(await canvas.findByLabelText(/^(name|pavadinimas)$/i), {
      target: { value: "Parduotuvės" },
    });
    await fireEvent.change(await canvas.findByLabelText(/^(text|tekstas)$/i), {
      target: { value: "MAXIMA" },
    });
    await userEvent.click(canvas.getByRole("checkbox", { name: tags[0]!.name }));
    await userEvent.click(canvas.getByRole("button", { name: /^(add|pridėti)$/i }));
    await expect(await canvas.findByRole("alert")).toBeInTheDocument();
  },
};
