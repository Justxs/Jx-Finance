import type { Meta, StoryObj } from "@storybook/react-vite";
import { getUpdateMyProfileMockHandler } from "@/api/generated/users/users.msw";
import { withWidth } from "@/storybook/decorators";
import { currentUser, longNameUser, validationProblem } from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { ProfileForm } from "./profile-form";

const meta = {
  title: "Features/Profile/ProfileForm",
  component: ProfileForm,
  parameters: { route: "/profile" },
  args: { profile: currentUser },
  decorators: [withWidth("column")],
} satisfies Meta<typeof ProfileForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongDisplayName: Story = { args: { profile: longNameUser } };

export const MissingDisplayName: Story = { args: { profile: { ...currentUser, displayName: "" } } };

export const Narrow: Story = {
  decorators: [withWidth("field")],
};

export const WrongPasswordAfterSubmit: Story = {
  parameters: withHandlers(
    getUpdateMyProfileMockHandler(
      failWith({ ...validationProblem, detail: "Current password is incorrect." }),
    ),
  ),
};

export const PendingAfterSubmit: Story = {
  parameters: withHandlers(getUpdateMyProfileMockHandler(pending)),
};
