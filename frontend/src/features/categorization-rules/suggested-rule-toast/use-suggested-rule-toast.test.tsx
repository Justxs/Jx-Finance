import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, expect, test, vi } from "vitest";
import { Toaster } from "@/components/ui/sonner/sonner";
import { categories, suggestedRules } from "@/storybook/fixtures";
import { createQueryWrapper } from "@/test/query";
import { settingsFixture } from "@/test/settings";
import { ruleFromSuggestion } from "../suggested-rules/suggested-rules";
import { useSuggestedRuleToast } from "./use-suggested-rule-toast";

const suggestion = suggestedRules[0]!;
const question = 'Always categorize descriptions starting with "LIDL" as Maistas?';

afterEach(() => {
  act(() => {
    toast.dismiss();
  });
});

function json(body: unknown) {
  return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
}

function setup(answer: unknown[] = [suggestion], categorizationRules = true) {
  const { Wrapper } = createQueryWrapper({
    settings: settingsFixture({ features: { categorizationRules } }),
  });
  const fetch = vi.fn((_url: string, init?: RequestInit) =>
    Promise.resolve(json(init?.method === "GET" ? answer : {})),
  );
  vi.stubGlobal("fetch", fetch);

  render(<Toaster />);
  const hook = renderHook(() => useSuggestedRuleToast(categories), { wrapper: Wrapper });
  return { fetch, ...hook };
}

function posted(fetch: ReturnType<typeof setup>["fetch"], path: string): unknown {
  const body = fetch.mock.calls.find(
    ([url, init]) => url.endsWith(path) && init?.method === "POST",
  )?.[1]?.body;
  return typeof body === "string" ? JSON.parse(body) : undefined;
}

test("asks about the suggestion the saved row completes", async () => {
  const { result, fetch } = setup();

  await act(() => result.current.offerAfterSave("t1"));

  expect(fetch.mock.calls[0]![0]).toContain("/api/categorization-rules/suggested?transactionId=t1");
  expect(await screen.findByText(question)).toBeInTheDocument();
});

test("create rule posts the suggested body unchanged", async () => {
  const { result, fetch } = setup();
  await act(() => result.current.offerAfterSave("t1"));

  fireEvent.click(await screen.findByRole("button", { name: "Create rule" }));

  await waitFor(() =>
    expect(posted(fetch, "/api/categorization-rules")).toEqual(ruleFromSuggestion(suggestion)),
  );
});

test("don't ask again dismisses the key and the category", async () => {
  const { result, fetch } = setup();
  await act(() => result.current.offerAfterSave("t1"));

  fireEvent.click(await screen.findByRole("button", { name: "Don't ask again" }));

  await waitFor(() =>
    expect(posted(fetch, "/api/categorization-rules/suggested/dismiss")).toEqual({
      key: suggestion.key,
      categoryId: suggestion.categoryId,
    }),
  );
});

test("stays quiet when the save completes no suggestion", async () => {
  const { result, fetch } = setup([]);

  await act(() => result.current.offerAfterSave("t1"));

  expect(fetch).toHaveBeenCalledOnce();
  expect(screen.queryByText(question)).toBeNull();
});

test("asks nothing while rules are switched off", async () => {
  const { result, fetch } = setup([suggestion], false);

  await act(() => result.current.offerAfterSave("t1"));

  expect(fetch).not.toHaveBeenCalled();
  expect(screen.queryByText(question)).toBeNull();
});
