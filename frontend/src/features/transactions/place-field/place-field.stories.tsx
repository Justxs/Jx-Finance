import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor } from "storybook/test";
import { getPlacesMockHandler } from "@/api/generated/transactions/transactions.msw";
import { useAppForm } from "@/components/form";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { nearbyPlaceSuggestions, placeSuggestions } from "@/storybook/fixtures";
import { withHandlers } from "@/storybook/handlers";
import { PlaceField } from "./place-field";

const PERMISSION_DENIED = 1;
const TIMEOUT = 3;
const RIMI = "Rimi Hyper, Ozo g. 25, Vilnius";

interface DemoProps {
  place?: string;
  latitude?: number | null;
  longitude?: number | null;
}

function Demo({ place = "", latitude = null, longitude = null }: Readonly<DemoProps>) {
  const form = useAppForm({ defaultValues: { place, latitude, longitude } });

  return (
    <FormGrid className="w-xl">
      <PlaceField
        form={form}
        fields={{ place: "place", latitude: "latitude", longitude: "longitude" }}
        idPrefix="demo"
        className="col-span-full"
      />
    </FormGrid>
  );
}

type Outcome = { latitude: number; longitude: number } | { code: number };

function override(target: object, key: string, value: unknown) {
  const original = Object.getOwnPropertyDescriptor(target, key);
  Object.defineProperty(target, key, { configurable: true, value });
  return () => {
    if (original) {
      Object.defineProperty(target, key, original);
    } else {
      Reflect.deleteProperty(target, key);
    }
  };
}

function geolocationOf(outcome: Outcome) {
  return {
    getCurrentPosition(
      success: (position: { coords: { latitude: number; longitude: number } }) => void,
      failure: (error: { code: number }) => void,
    ) {
      if ("code" in outcome) {
        failure(outcome);
        return;
      }
      success({ coords: outcome });
    },
  };
}

function browser(secure: boolean, outcome?: Outcome) {
  return () => {
    const restoreContext = override(globalThis, "isSecureContext", secure);
    const restoreGeolocation = outcome
      ? override(navigator, "geolocation", geolocationOf(outcome))
      : () => undefined;
    return () => {
      restoreGeolocation();
      restoreContext();
    };
  };
}

const atRimi = { latitude: 54.716123, longitude: 25.277941 };

const meta = {
  title: "Features/Transactions/PlaceField",
  component: Demo,
  args: {},
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Suggestions: Story = {
  beforeEach: browser(true),
  play: async ({ canvas, canvasElement }) => {
    const input = await canvas.findByRole("combobox", { name: "Place" });
    await expect(input).toHaveAttribute("list", "demo-place-suggestions");
    await waitFor(() =>
      expect(canvasElement.querySelectorAll("#demo-place-suggestions option")).toHaveLength(
        placeSuggestions.length,
      ),
    );
    await expect(canvas.getByRole("button", { name: "Use my location" })).toBeEnabled();
  },
};

export const NoSuggestions: Story = {
  parameters: withHandlers(getPlacesMockHandler([])),
  play: async ({ canvas, canvasElement }) => {
    await userEvent.type(await canvas.findByRole("combobox", { name: "Place" }), "Turgus");
    await waitFor(() =>
      expect(canvasElement.querySelectorAll("#demo-place-suggestions option")).toHaveLength(0),
    );
    await expect(canvas.getByRole("combobox", { name: "Place" })).toHaveValue("Turgus");
  },
};

export const LocatedWithANearbyName: Story = {
  parameters: withHandlers(getPlacesMockHandler(nearbyPlaceSuggestions)),
  beforeEach: browser(true, atRimi),
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Use my location" }));

    await waitFor(() => expect(canvas.getByRole("combobox", { name: "Place" })).toHaveValue(RIMI));
    await expect(canvas.getByText(/Location saved/u)).toBeVisible();

    await userEvent.click(canvas.getByRole("button", { name: "Remove the saved location" }));
    await expect(canvas.queryByText(/Location saved/u)).toBeNull();
  },
};

export const LocatedWithoutAName: Story = {
  beforeEach: browser(true, atRimi),
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Use my location" }));

    await expect(await canvas.findByText(/Location saved/u)).toBeVisible();
    await expect(canvas.getByRole("combobox", { name: "Place" })).toHaveValue("");
  },
};

export const APlaceAlreadyTypedIsKept: Story = {
  args: { place: "Turgus" },
  parameters: withHandlers(getPlacesMockHandler(nearbyPlaceSuggestions)),
  beforeEach: browser(true, atRimi),
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Use my location" }));

    await expect(await canvas.findByText(/Location saved/u)).toBeVisible();
    await expect(canvas.getByRole("combobox", { name: "Place" })).toHaveValue("Turgus");
  },
};

export const Denied: Story = {
  beforeEach: browser(true, { code: PERMISSION_DENIED }),
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Use my location" }));

    await expect(await canvas.findByRole("status")).toHaveTextContent(
      "The browser was not allowed to share your location.",
    );
    await expect(canvas.queryByText(/Location saved/u)).toBeNull();
  },
};

export const TimedOut: Story = {
  beforeEach: browser(true, { code: TIMEOUT }),
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Use my location" }));

    await expect(await canvas.findByRole("status")).toHaveTextContent(
      "Your location could not be found in time.",
    );
  },
};

export const InsecureContext: Story = {
  beforeEach: browser(false),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("combobox", { name: "Place" })).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Use my location" })).toBeNull();
  },
};

export const SavedLocation: Story = {
  args: { place: RIMI, latitude: atRimi.latitude, longitude: atRimi.longitude },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/Location saved/u)).toBeVisible();
  },
};
