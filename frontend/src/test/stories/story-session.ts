import { composeStories, setProjectAnnotations } from "@storybook/react-vite";
import { mswLoader } from "msw-storybook-addon/csf3";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, it } from "vitest";
import { preferencesCollection } from "@/stores/preferences";
import { mockWorkerLoader, warnAboutUnhandledRequest } from "../../../.storybook/mock-worker";
import preview from "../../../.storybook/preview";
import { type AccessibilityParameters, expectNoAccessibilityViolations } from "./accessibility";

export type StoryModule = Parameters<typeof composeStories>[0];
type MockSetup = Parameters<typeof mswLoader>[0];

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

const PREFERENCES_ROW = "browser";
const server = setupServer();
const mockServerLoader = mswLoader((() => server) as unknown as MockSetup);

const annotations = setProjectAnnotations([
  {
    ...preview,
    loaders: [preview.loaders ?? []]
      .flat()
      .map((loader) => (loader === mockWorkerLoader ? mockServerLoader : loader)),
  },
]);

async function composeFile({ path, load }: StoryFile) {
  return { path, stories: Object.values(composeStories(await load())) as ComposedStory[] };
}

function resetPreferences() {
  if (preferencesCollection.has(PREFERENCES_ROW)) {
    preferencesCollection.delete(PREFERENCES_ROW);
  }
}

export async function registerStoryTests(storyFiles: readonly StoryFile[]) {
  const files = await Promise.all(storyFiles.map(composeFile));
  let mounted: ComposedStory | undefined;

  beforeAll(async () => {
    server.listen({ onUnhandledRequest: warnAboutUnhandledRequest });
    await annotations.beforeAll?.();
  });

  afterEach(async () => {
    await mounted?.load();
    mounted = undefined;
    server.resetHandlers();
    resetPreferences();
  });

  afterAll(() => {
    server.close();
  });

  for (const { path, stories } of files) {
    describe(path.replace(/^\/src\//u, ""), () => {
      for (const story of stories) {
        it.skipIf(story.tags.includes(BROWSER_ONLY_TAG))(story.storyName, async () => {
          mounted = story;
          await story.run();
          await expectNoAccessibilityViolations(story.parameters.a11y);
        });
      }
    });
  }
}
