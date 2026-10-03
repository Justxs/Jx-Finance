import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { createQueryWrapper } from "@/test/query";
import { DeliveryStatus } from "./delivery-status";

test("a channel that is not set up shows nothing", () => {
  const { Wrapper } = createQueryWrapper();

  const { container } = render(
    <DeliveryStatus configured={false} lastDeliveredAt={null} lastError={null} />,
    { wrapper: Wrapper },
  );

  expect(container).toBeEmptyDOMElement();
});

test("a set-up channel says whether anything arrived and what went wrong last", () => {
  const { Wrapper } = createQueryWrapper();

  render(<DeliveryStatus configured lastDeliveredAt={null} lastError="Bot removed" />, {
    wrapper: Wrapper,
  });

  expect(screen.getByText("Nothing has been delivered yet.")).toBeInTheDocument();
  expect(screen.getByText("Last problem: Bot removed")).toBeInTheDocument();
});
