import type { Meta, StoryObj } from "@storybook/react-vite";
import { getHouseholdsMockHandler } from "@/api/generated/households/households.msw";
import { QueryBoundary } from "@/components/query-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { familyHousehold, gardenHousehold } from "@/storybook/fixtures";
import { emptyHandlers, errorHandlers, handlers, loadingHandlers } from "@/storybook/handlers";
import { HouseholdsPage } from "./households-page";

const meta = {
  title: "Features/Households/HouseholdsPage",
  component: HouseholdsPage,
  parameters: { layout: "fullscreen", route: "/households" },
  render: () => (
    <div className="p-6">
      <QueryBoundary fallback={<Skeleton className="h-96 w-full" />}>
        <HouseholdsPage />
      </QueryBoundary>
    </div>
  ),
} satisfies Meta<typeof HouseholdsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const OwnerOnly: Story = {
  parameters: {
    msw: {
      handlers: [getHouseholdsMockHandler([familyHousehold]), ...handlers],
    },
  },
};

export const MemberOnly: Story = {
  parameters: {
    msw: {
      handlers: [getHouseholdsMockHandler([gardenHousehold]), ...handlers],
    },
  },
};

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };
