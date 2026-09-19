import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { useGetAccountsSuspense } from "@/api/generated";
import { errorHandlers, loadingHandlers } from "@/storybook/handlers";
import { Skeleton } from "../ui/skeleton";
import { QueryBoundary } from "./query-boundary";

function AccountNames() {
  const accounts = useGetAccountsSuspense();

  return (
    <ul className="divide-y divide-border text-sm">
      {(accounts.data ?? []).map((account) => (
        <li key={account.id} className="px-6 py-3">
          {account.name}
        </li>
      ))}
    </ul>
  );
}

function ThrowsWhileBroken({ broken }: Readonly<{ broken: boolean }>) {
  if (broken) {
    throw new Error("Story render failure");
  }

  return <p className="px-6 py-8 text-sm">Recovered after retry.</p>;
}

function RenderErrorExample() {
  const [broken, setBroken] = useState(true);

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={broken}
          onChange={(event) => setBroken(event.target.checked)}
        />
        Child throws while rendering (untick, then retry)
      </label>
      <section className="card">
        <QueryBoundary fallback={<Skeleton className="m-6 h-24" />}>
          <ThrowsWhileBroken broken={broken} />
        </QueryBoundary>
      </section>
    </div>
  );
}

const meta = {
  title: "Components/QueryBoundary",
  component: QueryBoundary,
  args: {
    fallback: <Skeleton className="m-6 h-24" />,
    children: <AccountNames />,
  },
  decorators: [
    (Story) => (
      <div className="w-[min(90vw,32rem)]">
        <Story />
      </div>
    ),
  ],
  render: (args) => (
    <section className="card">
      <QueryBoundary {...args} />
    </section>
  ),
} satisfies Meta<typeof QueryBoundary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ErrorWithRetry: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const CustomErrorClassName: Story = {
  args: { errorClassName: "px-2 py-2 text-expense" },
  parameters: { msw: { handlers: errorHandlers } },
};

export const RenderErrorRecovers: Story = { render: () => <RenderErrorExample /> };
