import { globSync } from "node:fs";
import { it } from "vitest";
import type { StoryModule } from "./story-session";

const SHARD_COUNT = 6;

const storyPaths = globSync("src/**/*.stories.tsx").map((path) => `/${path.replaceAll("\\", "/")}`);

function storyFile(path: string) {
  function load(): Promise<StoryModule> {
    return import(path);
  }
  return { path, load };
}

function shardFiles(shard: number) {
  const only = process.env.STORY_FILE;
  return storyPaths
    .toSorted((left, right) => left.localeCompare(right))
    .filter((path) => !only || path.includes(only))
    .filter((_, index) => index % SHARD_COUNT === shard)
    .map(storyFile);
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
