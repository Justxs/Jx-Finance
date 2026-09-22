import type { Meta, StoryObj } from "@storybook/react-vite";
import { Suspense } from "react";
import { getMeMockHandler } from "@/api/generated/auth/auth.msw";
import { setSidebarCollapsed } from "@/stores/sidebar-store";
import { longNameUser, memberUser } from "@/storybook/fixtures";
import { withHandlers } from "@/storybook/handlers";
import { Skeleton } from "../ui/skeleton/skeleton";
import { AppSidebar } from "./app-sidebar";

function SidebarExample() {
  return (
    <div className="flex min-h-screen">
      <Suspense fallback={<Skeleton className="h-screen w-60 rounded-none" />}>
        <AppSidebar />
      </Suspense>
      <main className="flex-1 p-6 text-sm text-muted-foreground">
        Page content. The sidebar is hidden below the md breakpoint.
      </main>
    </div>
  );
}

const meta = {
  title: "Components/AppSidebar",
  component: AppSidebar,
  parameters: { layout: "fullscreen" },
  render: () => <SidebarExample />,
  beforeEach: () => {
    setSidebarCollapsed(false);
  },
} satisfies Meta<typeof AppSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ActiveRoute: Story = { parameters: { route: "/transactions" } };

export const Collapsed: Story = {
  beforeEach: () => {
    setSidebarCollapsed(true);
    return () => setSidebarCollapsed(false);
  },
};

export const MemberWithoutUsersLink: Story = {
  parameters: withHandlers(getMeMockHandler(memberUser)),
};

export const LongUserName: Story = {
  parameters: withHandlers(getMeMockHandler(longNameUser)),
};
