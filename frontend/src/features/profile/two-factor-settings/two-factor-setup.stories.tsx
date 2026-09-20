import type { Meta, StoryObj } from "@storybook/react-vite";
import QRCode from "qrcode";
import { type ComponentProps, Suspense, use } from "react";
import { fn } from "storybook/test";
import { getEnableTwoFactorMockHandler } from "@/api/generated/auth/auth.msw";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { twoFactorSetup, validationProblem } from "@/storybook/fixtures";
import { failWith, handlers, pending } from "@/storybook/handlers";
import { TwoFactorSetup } from "./two-factor-setup";

const qrDataUrlPromise = QRCode.toDataURL(twoFactorSetup.authenticatorUri ?? "");

type SetupProps = ComponentProps<typeof TwoFactorSetup>;

function SetupWithGeneratedQr(props: Readonly<SetupProps>) {
  const generated = use(qrDataUrlPromise);

  return <TwoFactorSetup {...props} qrDataUrl={props.qrDataUrl || generated} />;
}

const meta = {
  title: "Features/Profile/TwoFactorSetup",
  component: TwoFactorSetup,
  args: {
    qrDataUrl: "",
    sharedKey: twoFactorSetup.sharedKey ?? "",
    onEnabled: fn(),
    onCancel: fn(),
  },
  render: (args) => (
    <div className="w-[28rem] max-w-full">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <SetupWithGeneratedQr {...args} />
      </Suspense>
    </div>
  ),
} satisfies Meta<typeof TwoFactorSetup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongSharedKey: Story = {
  args: {
    sharedKey: "JBSWY3DPEHPK3PXPK5TQMZXW6YTBONQXJBSWY3DPEHPK3PXPK5TQMZXW6YTBONQXJBSWY3DPEHPK3PXP",
  },
};

export const Narrow: Story = {
  render: (args) => (
    <div className="w-64">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <SetupWithGeneratedQr {...args} />
      </Suspense>
    </div>
  ),
};

export const InvalidCodeAfterSubmit: Story = {
  parameters: {
    msw: {
      handlers: [
        getEnableTwoFactorMockHandler(
          failWith({ ...validationProblem, detail: "The verification code is invalid." }, 400),
        ),
        ...handlers,
      ],
    },
  },
};

export const PendingAfterSubmit: Story = {
  parameters: {
    msw: {
      handlers: [getEnableTwoFactorMockHandler(pending), ...handlers],
    },
  },
};
