import type { Meta, StoryObj } from "@storybook/react-vite";
import { HttpResponse, delay, http } from "msw";
import { handlers } from "@/storybook/handlers";
import { LogoutButton } from "./logout-button";

const meta = {
  title: "Components/LogoutButton",
  component: LogoutButton,
} satisfies Meta<typeof LogoutButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const PendingAfterClick: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post("*/api/auth/logout", async () => {
          await delay("infinite");
          return new HttpResponse(null, { status: 204 });
        }),
        ...handlers,
      ],
    },
  },
};

export const FailsAfterClick: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post("*/api/auth/logout", () => new HttpResponse(null, { status: 500 })),
        ...handlers,
      ],
    },
  },
};
