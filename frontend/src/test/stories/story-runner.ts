import { it } from "vitest";
import type { StoryModule } from "./story-session";

export const SHARD_COUNT = 6;

const storyFiles = import.meta.glob<StoryModule>("/src/**/*.stories.tsx");

function shardFiles(shard: number) {
  const only = process.env.STORY_FILE;
  return Object.entries(storyFiles)
    .toSorted(([left], [right]) => left.localeCompare(right))
    .filter(([path]) => !only || path.includes(only))
    .filter((_, index) => index % SHARD_COUNT === shard)
    .map(([path, load]) => ({ path, load }));
}

export async function runStoryShard(shard: number) {
  const files = shardFiles(shard);
  if (files.length === 0) {
    it.skip("has no story file to run", () => {});
    return;
  }
  const { registerStoryTests } = await import("./story-session");
  await registerStoryTests(files);
}
