import type { Meta, StoryObj } from "@storybook/react-vite";
import { Info } from "lucide-react";
import { Checkbox } from "../checkbox/checkbox";
import { Input } from "../input/input";
import { Label } from "./label";

const meta = {
  title: "UI/Label",
  component: Label,
  args: { children: "Account name" },
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithInput: Story = {
  render: (args) => (
    <div className="w-64 space-y-1.5">
      <Label {...args} htmlFor="label-story-input" />
      <Input id="label-story-input" placeholder="Swedbank checking" />
    </div>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <Label>
      Opening balance
      <Info className="size-3.5 text-muted-foreground" />
    </Label>
  ),
};

export const WrappingCheckbox: Story = {
  render: () => (
    <Label>
      <Checkbox defaultChecked />
      Include in net worth
    </Label>
  ),
};

export const DisabledPeer: Story = {
  render: () => (
    <div className="flex w-64 flex-col-reverse gap-1.5">
      <Input id="label-story-disabled" className="peer" defaultValue="Locked" disabled />
      <Label htmlFor="label-story-disabled">Currency</Label>
    </div>
  ),
};

export const DisabledGroup: Story = {
  render: () => (
    <div className="group w-64 space-y-1.5" data-disabled="true">
      <Label htmlFor="label-story-group">Household</Label>
      <Input id="label-story-group" defaultValue="Kazlauskai" disabled />
    </div>
  ),
};

export const LongText: Story = {
  args: {
    children:
      "Send a reminder to every member of the household before this recurring bill becomes due",
    className: "w-56 leading-snug",
  },
};
