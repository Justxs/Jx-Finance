import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor, within } from "storybook/test";
import { getUpdateMyProfileMockHandler } from "@/api/generated/users/users.msw";
import { withWidth } from "@/storybook/decorators";
import {
  currentUser,
  longNameUser,
  reminderSubscriber,
  unverifiedUser,
  validationProblem,
} from "@/storybook/fixtures";
import { emailEnabledHandler, failWith, pending, withHandlers } from "@/storybook/handlers";
import { ProfileForm } from "./profile-form";

const meta = {
  title: "Features/Profile/ProfileForm",
  component: ProfileForm,
  parameters: { route: "/profile" },
  args: { profile: currentUser },
  decorators: [withWidth("w-[28rem] max-w-full")],
} satisfies Meta<typeof ProfileForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongDisplayName: Story = { args: { profile: longNameUser } };

export const MissingDisplayName: Story = { args: { profile: { ...currentUser, displayName: "" } } };

export const Narrow: Story = {
  decorators: [withWidth("field")],
};

export const ReminderEmailsNeedAMailServer: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const preference = canvas.getByRole("checkbox", {
      name: "Email me about a due recurring entry",
    });
    await expect(preference).not.toBeChecked();
    await expect(canvas.getByText(/cannot send email yet/u)).toBeInTheDocument();
  },
};

export const ReminderEmailsTurnedOn: Story = {
  args: { profile: reminderSubscriber },
  parameters: withHandlers(emailEnabledHandler),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(canvas.getByText(/One message per entry and day/u)).toBeInTheDocument(),
    );
    await expect(
      canvas.getByRole("checkbox", { name: "Email me about a due recurring entry" }),
    ).toBeChecked();
  },
};

export const ReminderEmailsNeedAConfirmedAddress: Story = {
  args: { profile: unverifiedUser },
  parameters: withHandlers(emailEnabledHandler),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(canvas.getByText(/Confirm your address first/u)).toBeInTheDocument(),
    );
  },
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
