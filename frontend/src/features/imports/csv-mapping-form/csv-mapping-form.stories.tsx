import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, userEvent, waitFor } from "storybook/test";
import { getCreateCsvMappingMockHandler } from "@/api/generated/imports/imports.msw";
import { withWidth } from "@/storybook/decorators";
import {
  cardInspection,
  csvMappings,
  headerlessInspection,
  revolutInspection,
  revolutInspectionFitting,
  revolutMapping,
  csvMappingIncompleteProblem,
} from "@/storybook/fixtures";
import { failWith, withHandlers } from "@/storybook/handlers";
import { chooseOption } from "@/storybook/interactions";
import { CsvMappingForm } from "./csv-mapping-form";

const meta = {
  title: "Features/Imports/CsvMappingForm",
  component: CsvMappingForm,
  args: {
    inspection: revolutInspection,
    onRead: fn(),
    onUse: fn(),
    onSaved: fn(),
    onCancel: fn(),
  },
  decorators: [withWidth("wide")],
} satisfies Meta<typeof CsvMappingForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SignedAmount: Story = {
  play: async ({ canvas, args }) => {
    await fireEvent.change(await canvas.findByLabelText(/^(name|pavadinimas)$/i), {
      target: { value: "Revolut" },
    });
    await expect(canvas.getByRole("region", { name: /first rows|pirmosios/i })).toHaveTextContent(
      "Cash at Vilnius",
    );
    await userEvent.click(canvas.getByRole("button", { name: /save and preview|išsaugoti/i }));
    await waitFor(() => expect(args.onSaved).toHaveBeenCalled());
  },
};

export const CardStatement: Story = {
  args: { inspection: cardInspection },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("radio", { name: /card statement|kortelės/i }));
    await expect(
      await canvas.findByText(/12.50 is a purchase|12,50 yra pirkinys/i),
    ).toBeInTheDocument();
  },
};

export const DebitAndCredit: Story = {
  args: { inspection: cardInspection },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("radio", { name: /debit and credit|debetas/i }));
    await expect(
      await canvas.findByText(/money out \(debit\)|išlaidos \(debetas\)/i),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: /save and preview|išsaugoti/i }));
    await expect(
      await canvas.findAllByText(/choose the column this needs|pasirinkite reikiamą/i),
    ).not.toHaveLength(0);
  },
};

export const AmountWithDirection: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("radio", { name: /amount and direction|suma ir kryptis/i }),
    );
    await expect(await canvas.findByLabelText(/direction value|krypties reikšmė/i)).toBeVisible();
  },
};

export const WithoutHeaderRow: Story = {
  args: { inspection: headerlessInspection },
  play: async ({ canvas, args }) => {
    const noHeader = await canvas.findByRole("checkbox", {
      name: /no header row|neturi antraštės/i,
    });
    await expect(noHeader).toBeChecked();
    await expect(canvas.getByRole("region", { name: /first rows|pirmosios/i })).toHaveTextContent(
      /Column 1|1 stulpelis/,
    );
    await userEvent.click(noHeader);
    await expect(args.onRead).toHaveBeenCalledWith(
      expect.objectContaining({ noHeaderRow: false, skipLines: 0 }),
    );
  },
};

export const AmbiguousDateFormat: Story = {
  args: { inspection: cardInspection },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText(/more than one format|daugiau nei vienas formatas/i),
    ).toBeVisible();
    await chooseOption(canvas.getByLabelText(/^(date format|datos formatas)$/i), "MM/dd/yyyy");
  },
};

export const SavedMappingFits: Story = {
  args: { inspection: revolutInspectionFitting, fitting: csvMappings },
  play: async ({ canvas, args }) => {
    await userEvent.click(
      await canvas.findByRole("button", { name: /use revolut|naudoti revolut/i }),
    );
    await expect(args.onUse).toHaveBeenCalledWith(revolutMapping);
  },
};

export const EditingWithoutFile: Story = {
  args: { inspection: undefined, initial: revolutMapping, onRead: undefined },
  play: async ({ canvas }) => {
    await expect(await canvas.findByDisplayValue("Revolut")).toBeVisible();
    await expect(
      canvas.getByText(/without a reference column|be nuorodos stulpelio/i),
    ).toBeVisible();
  },
};

export const ServerRefusesTheMapping: Story = {
  parameters: withHandlers(getCreateCsvMappingMockHandler(failWith(csvMappingIncompleteProblem))),
  play: async ({ canvas }) => {
    await fireEvent.change(await canvas.findByLabelText(/^(name|pavadinimas)$/i), {
      target: { value: "Revolut" },
    });
    await userEvent.click(canvas.getByRole("button", { name: /save and preview|išsaugoti/i }));
    await expect(await canvas.findByRole("alert")).toBeVisible();
  },
};
