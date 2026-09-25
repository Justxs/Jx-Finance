import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent } from "storybook/test";
import { useAccountsSuspense } from "@/api/generated";
import { getAccountsMockHandler } from "@/api/generated/accounts/accounts.msw";
import { Card } from "@/components/ui/card/card";
import { withWidth } from "@/storybook/decorators";
import { checkingAccount, serverErrorProblem } from "@/storybook/fixtures";
import { errorHandlers, failWith, loadingHandlers, withHandlers } from "@/storybook/handlers";
import { Skeleton } from "../ui/skeleton/skeleton";
import { QueryBoundary } from "./query-boundary";

function AccountNames() {
  const accounts = useAccountsSuspense();

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
      <Card as="section">
        <QueryBoundary fallback={<Skeleton className="m-6 h-24" />}>
          <ThrowsWhileBroken broken={broken} />
        </QueryBoundary>
      </Card>
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
  parameters: { boundary: false },
  decorators: [withWidth("form")],
  render: (args) => (
    <Card as="section">
      <QueryBoundary {...args} />
    </Card>
  ),
} satisfies Meta<typeof QueryBoundary>;

export default meta;
type Story = StoryObj<typeof meta>;

const skeleton = '[data-slot="skeleton"]';

export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByText(checkingAccount.name)).toBeVisible();
    await expect(canvasElement.querySelector(skeleton)).toBeNull();
  },
};

export const Loading: Story = {
  parameters: { msw: { handlers: loadingHandlers } },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector(skeleton)).toBeInTheDocument();
  },
};

export const ErrorWithRetry: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const RetryRefetches: Story = {
  parameters: withHandlers(getAccountsMockHandler(failWith(serverErrorProblem), { once: true })),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Could not load this.");

    await userEvent.click(canvas.getByRole("button", { name: "Try again" }));

    await expect(await canvas.findByText(checkingAccount.name)).toBeVisible();
  },
};

export const CustomErrorFallback: Story = {
  args: { errorFallback: <p className="px-6 py-8 text-sm">Unavailable</p> },
  parameters: { msw: { handlers: errorHandlers } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Unavailable")).toBeVisible();
    await expect(canvas.queryByRole("alert")).toBeNull();
  },
};

export const CustomErrorClassName: Story = {
  args: { errorClassName: "px-2 py-2 text-expense" },
  parameters: { msw: { handlers: errorHandlers } },
};

export const RenderErrorRecovers: Story = {
  render: () => <RenderErrorExample />,
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("alert")).toBeVisible();

    await userEvent.click(canvas.getByRole("checkbox"));
    await userEvent.click(canvas.getByRole("button", { name: "Try again" }));

    await expect(await canvas.findByText("Recovered after retry.")).toBeVisible();
  },
};
