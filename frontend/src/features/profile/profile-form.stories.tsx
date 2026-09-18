import type { Meta, StoryObj } from "@storybook/react-vite";
import { HttpResponse, delay, http } from "msw";
import { currentUser, longNameUser, validationProblem } from "@/storybook/fixtures";
import { handlers } from "@/storybook/handlers";
import { ProfileForm } from "./profile-form";

const meta = {
  title: "Features/Profile/ProfileForm",
  component: ProfileForm,
  parameters: { route: "/profile" },
  args: { profile: currentUser },
  render: (args) => (
    <div className="w-[28rem] max-w-full">
      <ProfileForm {...args} />
    </div>
  ),
} satisfies Meta<typeof ProfileForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongDisplayName: Story = { args: { profile: longNameUser } };

export const MissingDisplayName: Story = { args: { profile: { ...currentUser, displayName: "" } } };

export const Narrow: Story = {
  render: (args) => (
    <div className="w-72">
      <ProfileForm {...args} />
    </div>
  ),
};

export const WrongPasswordAfterSubmit: Story = {
  parameters: {
    msw: {
      handlers: [
        http.put("*/api/users/me", () =>
          HttpResponse.json(
            { ...validationProblem, detail: "Current password is incorrect." },
            { status: 400, headers: { "Content-Type": "application/problem+json" } },
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
        http.put("*/api/users/me", async () => {
          await delay("infinite");
          return new HttpResponse(null, { status: 204 });
        }),
        ...handlers,
      ],
    },
  },
};
