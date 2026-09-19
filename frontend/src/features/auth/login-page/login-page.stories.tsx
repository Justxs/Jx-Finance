import type { Meta, StoryObj } from "@storybook/react-vite";
import { HttpResponse, delay, http } from "msw";
import { expect, userEvent, within } from "storybook/test";
import { loginTwoFactorRequired, unauthorizedProblem } from "@/storybook/fixtures";
import { handlers } from "@/storybook/handlers";
import { LoginPage } from "./login-page";

const meta = {
  title: "Features/Auth/LoginPage",
  component: LoginPage,
  parameters: { route: "/login" },
  render: () => (
    <div className="flex w-96 max-w-full justify-center">
      <LoginPage />
    </div>
  ),
} satisfies Meta<typeof LoginPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const TwoFactorStepAfterSubmit: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post("*/api/auth/login", () => HttpResponse.json(loginTwoFactorRequired)),
        ...handlers,
      ],
    },
  },
};

export const InvalidCredentialsAfterSubmit: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post("*/api/auth/login", () =>
          HttpResponse.json(
            { ...unauthorizedProblem, instance: "/api/auth/login", detail: "Invalid credentials." },
            { status: 401, headers: { "Content-Type": "application/problem+json" } },
          ),
        ),
        ...handlers,
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("Email"), "ruta@example.lt");
    await userEvent.type(canvas.getByLabelText("Password"), "fixture-value");
    await userEvent.click(canvas.getByRole("button", { name: "Sign in" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Invalid credentials.");
  },
};

export const PendingAfterSubmit: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post("*/api/auth/login", async () => {
          await delay("infinite");
          return new HttpResponse(null, { status: 204 });
        }),
        ...handlers,
      ],
    },
  },
};
