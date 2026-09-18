import type { Meta, StoryObj } from "@storybook/react-vite";
import { HttpResponse, delay, http } from "msw";
import QRCode from "qrcode";
import { type ComponentProps, Suspense, use } from "react";
import { fn } from "storybook/test";
import { Skeleton } from "@/components/ui/skeleton";
import { twoFactorSetup, validationProblem } from "@/storybook/fixtures";
import { handlers } from "@/storybook/handlers";
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
        http.post("*/api/auth/2fa/enable", () =>
          HttpResponse.json(
            { ...validationProblem, detail: "The verification code is invalid." },
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
        http.post("*/api/auth/2fa/enable", async () => {
          await delay("infinite");
          return new HttpResponse(null, { status: 204 });
        }),
        ...handlers,
      ],
    },
  },
};
