import type { Meta, StoryObj } from "@storybook/react-vite";
import { startTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { RowTransition } from "./row-transition";

const meta = {
  title: "Components/RowTransition",
  component: RowTransition,
  parameters: { providers: "none" },
} satisfies Meta<typeof RowTransition>;

export default meta;
type Story = StoryObj<typeof meta>;

const names = ["Maistas", "Transportas", "Pramogos", "Komunaliniai mokesčiai", "Sveikata"];

function Demo() {
  const [rows, setRows] = useState(names.slice(0, 3));

  function add() {
    startTransition(() => {
      setRows((current) => {
        const next = names.find((name) => !current.includes(name));
        return next ? [next, ...current] : current;
      });
    });
  }

  function remove(name: string) {
    startTransition(() => setRows((current) => current.filter((row) => row !== name)));
  }

  return (
    <div className="w-80 space-y-3">
      <Button variant="outline" size="sm" onClick={add} disabled={rows.length === names.length}>
        Add row
      </Button>
      <ul className="rows">
        {rows.map((name) => (
          <RowTransition key={name}>
            <li className="flex items-center justify-between py-2 text-sm">
              {name}
              <Button variant="ghost" size="sm" onClick={() => remove(name)}>
                Remove
              </Button>
            </li>
          </RowTransition>
        ))}
      </ul>
    </div>
  );
}

export const AddAndRemove: Story = {
  args: { children: null },
  render: () => <Demo />,
};
