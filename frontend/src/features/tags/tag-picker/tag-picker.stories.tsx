import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import type { TagResponse } from "@/api/generated/model";
import { withWidth } from "@/storybook/decorators";
import { ids, many, tags } from "@/storybook/fixtures";
import { TagPicker } from "./tag-picker";

const manyTags: TagResponse[] = many(tags, 24);

interface HarnessProps {
  tags: TagResponse[];
  initial?: string[];
  onChange: (next: string[]) => void;
}

const NOTHING: string[] = [];

function TagPickerHarness({ tags: list, initial = NOTHING, onChange }: Readonly<HarnessProps>) {
  const [value, setValue] = useState<string[]>(initial);

  return (
    <TagPicker
      tags={list}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

const meta = {
  title: "Features/Tags/TagPicker",
  component: TagPickerHarness,
  args: { tags, onChange: fn() },
  decorators: [withWidth("card")],
} satisfies Meta<typeof TagPickerHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SomeChosen: Story = {
  args: { initial: [ids.tags.holiday, ids.tags.car] },
};

export const NoTags: Story = { args: { tags: [] } };

export const WithSearch: Story = { args: { tags: manyTags } };

export const ChoosingATag: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const boxes = await canvas.findAllByRole("checkbox");
    await userEvent.click(boxes[0]!);
    await waitFor(() => expect(args.onChange).toHaveBeenCalledWith([ids.tags.holiday]));
  },
};
