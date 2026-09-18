import type { Meta, StoryObj } from "@storybook/react-vite";
import { HttpResponse, delay, http } from "msw";
import { serverErrorProblem } from "@/storybook/fixtures";
import { handlers } from "@/storybook/handlers";
import { SetupPage } from "./setup-page";

const meta = {
  title: "Features/Auth/SetupPage",
  component: SetupPage,
  parameters: { route: "/setup" },
  render: () => (
    <div className="flex w-96 max-w-full justify-center">
      <SetupPage />
    </div>
  ),
} satisfies Meta<typeof SetupPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ServerErrorAfterSubmit: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post("*/api/setup", () =>
          HttpResponse.json(
            { ...serverErrorProblem, instance: "/api/setup" },
            { status: 500, headers: { "Content-Type": "application/problem+json" } },
          ),
        ),
        ...handlers,
      ],
    },
  },
};

export const PendingAfterSubmit: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post("*/api/setup", async () => {
          await delay("infinite");
          return new HttpResponse(null, { status: 204 });
        }),
        ...handlers,
      ],
    },
  },
};
