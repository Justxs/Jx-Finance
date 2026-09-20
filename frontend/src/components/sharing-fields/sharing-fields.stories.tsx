import type { Meta, StoryObj } from "@storybook/react-vite";
import type { Scope } from "@/api/generated/model";
import { useAppForm } from "@/components/form";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { familyHousehold, gardenHousehold } from "@/storybook/fixtures";
import { SharingFields } from "./sharing-fields";

interface DemoProps {
  scope: Scope;
}

interface Values {
  scope: Scope;
  householdId: string;
}

function Demo({ scope }: Readonly<DemoProps>) {
  const defaultValues: Values = { scope, householdId: "" };
  const form = useAppForm({ defaultValues });

  return (
    <FormGrid className="w-xl">
      <SharingFields
        form={form}
        fields={{ scope: "scope", householdId: "householdId" }}
        idPrefix="demo"
        households={[familyHousehold, gardenHousehold]}
      />
    </FormGrid>
  );
}

const meta = {
  title: "Components/SharingFields",
  component: Demo,
  args: { scope: "personal" },
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Personal: Story = {};

export const Shared: Story = { args: { scope: "shared" } };
