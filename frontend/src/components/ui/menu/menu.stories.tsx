import type { Meta, StoryObj } from "@storybook/react-vite";
import { Copy, EllipsisVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button/button";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "./menu";

const meta = {
  title: "UI/Menu",
  component: Menu,
} satisfies Meta<typeof Menu>;

export default meta;
type Story = StoryObj;

function Example({ defaultOpen = false }: Readonly<{ defaultOpen?: boolean }>) {
  return (
    <Menu defaultOpen={defaultOpen}>
      <MenuTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label="Actions: Groceries" />}
      >
        <EllipsisVertical />
      </MenuTrigger>
      <MenuContent>
        <MenuItem>
          <Copy />
          Duplicate
        </MenuItem>
        <MenuItem disabled>
          <Pencil />
          Edit
        </MenuItem>
        <MenuSeparator />
        <MenuItem destructive>
          <Trash2 />
          Delete
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

export const Default: Story = { render: () => <Example /> };

export const Open: Story = { render: () => <Example defaultOpen /> };
