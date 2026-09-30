import { readFileSync } from "node:fs";
import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { afterEach, describe, expect, test } from "vitest";
import { createJxApi } from "../src/jx-api.js";
import { createJxServer, jxTools } from "../src/tools.js";

const baseUrl = "https://finance.home.lan";
const token = "jxp_TESTTEST_c2VjcmV0LWZvci10aGUtdW5pdC10ZXN0LW9ubHktMDAwMDA";

interface Sent {
  method: string;
  url: URL;
  authorization: string | null;
}

function recorded(tool: string): unknown {
  return JSON.parse(readFileSync(new URL(`recorded/${tool}.json`, import.meta.url), "utf8"));
}

function recordedFetch(
  sent: Sent[],
  answers: Record<string, Response | (() => Response)>,
): typeof fetch {
  return async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input);
    const headers = new Headers(init?.headers);
    sent.push({ method: init?.method ?? "GET", url, authorization: headers.get("Authorization") });
    const answer = answers[url.pathname];
    if (!answer) {
      return new Response(null, { status: 404 });
    }

    return typeof answer === "function" ? answer() : answer.clone();
  };
}

const clients: Client[] = [];

async function connect(fetchImpl: typeof fetch) {
  const server = createJxServer(createJxApi(baseUrl, token, fetchImpl));
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  const client = new Client({ name: "jx-mcp-test", version: "0.0.0" });
  await client.connect(clientSide);
  clients.push(client);
  return client;
}

function textOf(result: { content: unknown }) {
  const [first] = result.content as { type: string; text: string }[];
  if (!first || first.type !== "text") {
    throw new Error("expected one text block");
  }

  return first.text;
}

function recordedAnswers() {
  return Object.fromEntries(jxTools.map((tool) => [tool.path, Response.json(recorded(tool.name))]));
}

afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close()));
});

test("the server offers exactly the seven read-only tools", async () => {
  const client = await connect(recordedFetch([], {}));

  const { tools } = await client.listTools();

  expect(tools.map((tool) => tool.name).sort()).toEqual([
    "get_net_worth",
    "get_report_summary",
    "list_accounts",
    "list_budgets",
    "list_goals",
    "list_recurring_entries",
    "list_transactions",
  ]);
  for (const tool of tools) {
    expect(tool.annotations?.readOnlyHint).toBe(true);
    expect(tool.description?.length).toBeGreaterThan(20);
  }
});

describe.each(jxTools.map((tool) => [tool.name, tool.path] as const))("%s", (name, path) => {
  test(`answers the recorded response of GET ${path} with the token`, async () => {
    const sent: Sent[] = [];
    const client = await connect(recordedFetch(sent, recordedAnswers()));

    const result = await client.callTool({ name, arguments: {} });

    expect(result.isError).toBeFalsy();
    expect(JSON.parse(textOf(result))).toEqual(recorded(name));
    expect(sent).toHaveLength(1);
    expect(sent[0]?.method).toBe("GET");
    expect(sent[0]?.url.origin).toBe(baseUrl);
    expect(sent[0]?.url.pathname).toBe(path);
    expect(sent[0]?.authorization).toBe(`Bearer ${token}`);
  });
});

test("the ledger filters travel in the query and absent ones are left out", async () => {
  const sent: Sent[] = [];
  const client = await connect(recordedFetch(sent, recordedAnswers()));

  await client.callTool({
    name: "list_transactions",
    arguments: {
      dateFrom: "2026-09-01",
      dateTo: "2026-09-30",
      type: "expense",
      amountMin: "10.00",
      uncategorized: true,
    },
  });

  const query = Object.fromEntries(sent[0]?.url.searchParams ?? []);
  expect(query).toEqual({
    page: "1",
    pageSize: "50",
    dateFrom: "2026-09-01",
    dateTo: "2026-09-30",
    type: "expense",
    amountMin: "10.00",
    uncategorized: "true",
  });
});

test("arguments outside the contract are refused before any request", async () => {
  const sent: Sent[] = [];
  const client = await connect(recordedFetch(sent, recordedAnswers()));

  const result = await client.callTool({ name: "list_transactions", arguments: { pageSize: 500 } });

  expect(result.isError).toBe(true);
  expect(sent).toHaveLength(0);
});

test("a problem from the installation reaches the client as a tool error with its code", async () => {
  const problem = {
    status: 403,
    errors: [
      {
        name: "generalErrors",
        reason: "API tokens cannot use this route.",
        code: "token.notAllowed",
      },
    ],
  };
  const client = await connect(
    recordedFetch([], { "/api/goals": () => Response.json(problem, { status: 403 }) }),
  );

  const result = await client.callTool({ name: "list_goals", arguments: {} });

  expect(result.isError).toBe(true);
  expect(textOf(result)).toBe(
    "Jx Finance answered 403. token.notAllowed: API tokens cannot use this route.",
  );
});
