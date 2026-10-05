import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { createQueryWrapper } from "@/test/query";
import { ChannelActions } from "./channel-actions";

test("the test button sends a test only when there is something to test", () => {
  const { Wrapper } = createQueryWrapper();
  const onTest = vi.fn();

  const { rerender } = render(
    <ChannelActions
      error={null}
      testLabel="Send a test"
      testHint="Save first."
      testPending={false}
      canTest
      onTest={onTest}
    >
      <button type="submit">Save</button>
    </ChannelActions>,
    { wrapper: Wrapper },
  );
  fireEvent.click(screen.getByRole("button", { name: /Send a test/u }));
  expect(onTest).toHaveBeenCalledOnce();

  rerender(
    <ChannelActions
      error={null}
      testLabel="Send a test"
      testHint="Save first."
      testPending={false}
      canTest={false}
      onTest={onTest}
    >
      <button type="submit">Save</button>
    </ChannelActions>,
  );
  expect(screen.getByRole("button", { name: /Send a test/u })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
});
