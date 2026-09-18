import type { Meta, StoryObj } from "@storybook/react-vite";
import { HttpResponse, http } from "msw";
import { Suspense } from "react";
import { toggleSidebar } from "@/stores/sidebar-store";
import { longNameUser, memberUser } from "@/storybook/fixtures";
import { handlers } from "@/storybook/handlers";
import { AppSidebar } from "./app-sidebar";
import { Skeleton } from "../ui/skeleton";

const COLLAPSED_KEY = "jx-sidebar-collapsed";

function setSidebarCollapsed(collapsed: boolean) {
  const current = localStorage.getItem(COLLAPSED_KEY) === "true";
  if (current !== collapsed) {
    toggleSidebar();
  }
}

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
  parameters: {
    msw: {
      handlers: [http.get("*/api/auth/me", () => HttpResponse.json(memberUser)), ...handlers],
    },
  },
};

export const LongUserName: Story = {
  parameters: {
    msw: {
      handlers: [http.get("*/api/auth/me", () => HttpResponse.json(longNameUser)), ...handlers],
    },
  },
};
