import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../button/button";
import { Section, SectionHeader, SectionTitle, TitledSection } from "./section";

const meta = {
  title: "UI/Section",
  component: Section,
} satisfies Meta<typeof Section>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Section className="w-[min(90vw,32rem)]">
      <SectionTitle className="mb-4">Spending by category</SectionTitle>
      <p className="text-sm text-muted-foreground">Groceries, transport and everything else.</p>
    </Section>
  ),
};

export const WithHeaderAction: Story = {
  render: () => (
    <Section className="w-[min(90vw,32rem)]">
      <SectionHeader title="Transfers">
        <Button variant="outline" size="sm">
          Add transfer
        </Button>
      </SectionHeader>
      <p className="text-sm text-muted-foreground">Money moved between your own accounts.</p>
    </Section>
  ),
};

export const PanelSurface: Story = {
  render: () => (
    <Section as="div" className="w-[min(90vw,32rem)]">
      <p className="text-sm">A panel is the same surface without a heading of its own.</p>
    </Section>
  ),
};

export const Nested: Story = {
  render: () => (
    <Section className="w-[min(90vw,32rem)] space-y-4">
      <SectionTitle>Outer section</SectionTitle>
      <Section as="div">
        <p className="text-sm text-muted-foreground">
          A surface inside a surface drops its own background, radius and padding.
        </p>
      </Section>
    </Section>
  ),
};

export const InsideDialog: Story = {
  render: () => (
    <div role="dialog" aria-label="Example" className="w-[min(90vw,32rem)] border p-4">
      <Section>
        <SectionTitle>Inside a dialog</SectionTitle>
        <p className="mt-2 text-sm text-muted-foreground">The dialog is already the surface.</p>
      </Section>
    </div>
  ),
};

export const Titled: Story = {
  render: () => (
    <div className="w-[min(90vw,32rem)]">
      <TitledSection title="Signed-in devices" description="Sign out a device you no longer use.">
        <p className="mt-4 text-sm">Firefox on Windows, active now</p>
      </TitledSection>
    </div>
  ),
};
