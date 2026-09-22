import { composeStories, setProjectAnnotations } from "@storybook/react-vite";
import { RequestHandler } from "msw";
import { setupServer } from "msw/node";
import { composeStory } from "storybook/preview-api";
import { afterAll, afterEach, beforeAll, describe, it } from "vitest";
import { resetPreferences } from "@/test/preferences";
import { mockWorkerLoader, warnAboutUnhandledRequest } from "../../../.storybook/mock-worker";
import preview from "../../../.storybook/preview";
import { type AccessibilityParameters, expectNoAccessibilityViolations } from "./accessibility";

export type StoryModule = Parameters<typeof composeStories>[0];

interface ComposedStory {
  storyName: string;
  tags: string[];
  parameters: { a11y?: AccessibilityParameters };
  run: () => Promise<void>;
  load: () => Promise<void>;
}

export interface StoryFile {
  path: string;
  load: () => Promise<StoryModule>;
}

export const BROWSER_ONLY_TAG = "browser-only";

const server = setupServer();
const teardownStory = composeStory({}, { title: "Teardown", render: () => null }, {}, {});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function storyHandlers(parameter: unknown): RequestHandler[] {
  const source = isRecord(parameter) && !Array.isArray(parameter) ? parameter.handlers : parameter;
  let lists: unknown[] = [];
  if (Array.isArray(source)) {
    lists = source;
  } else if (isRecord(source)) {
    lists = Object.values(source);
  }
  return lists.flat().filter((handler) => handler instanceof RequestHandler);
}

function mockServerLoader(context: { parameters: { msw?: unknown } }) {
  server.resetHandlers();
  const handlers = storyHandlers(context.parameters.msw);
  if (handlers.length > 0) {
    server.use(...handlers);
  }
  return Promise.resolve({});
}

const annotations = setProjectAnnotations([
  {
    ...preview,
    loaders: [preview.loaders ?? []]
      .flat()
      .map((loader) => (loader === mockWorkerLoader ? mockServerLoader : loader)),
  },
]);

function isComposedStory(value: unknown): value is ComposedStory {
  if (typeof value !== "function" && (typeof value !== "object" || value === null)) {
    return false;
  }
  return "storyName" in value && "run" in value && "load" in value;
}

function composedStory(value: unknown): ComposedStory {
  if (!isComposedStory(value)) {
    throw new TypeError("expected a composed story");
  }
  return value;
}

async function composeFile({ path, load }: StoryFile) {
  const composed: unknown[] = Object.values(composeStories(await load()));
  return { path, stories: composed.map(composedStory) };
}

export async function registerStoryTests(storyFiles: readonly StoryFile[]) {
  const files = await Promise.all(storyFiles.map(composeFile));

  beforeAll(async () => {
    server.listen({ onUnhandledRequest: warnAboutUnhandledRequest });
    await annotations.beforeAll?.();
  });

  afterEach(async () => {
    await teardownStory.load();
    server.resetHandlers();
    resetPreferences();
  });

  afterAll(async () => {
    await teardownStory.load();
    server.close();
  });

  for (const { path, stories } of files) {
    describe(path.replace(/^\/src\//u, ""), () => {
      for (const story of stories) {
        it.skipIf(story.tags.includes(BROWSER_ONLY_TAG))(story.storyName, async () => {
          await story.run();
          await expectNoAccessibilityViolations(story.parameters.a11y);
        });
      }
    });
  }
}
