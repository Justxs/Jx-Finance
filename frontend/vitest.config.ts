import { defineConfig } from "vitest/config";
import { reactPlugins, srcAlias } from "./vite.shared.ts";

export default defineConfig({
  plugins: reactPlugins(),
  resolve: { alias: srcAlias },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts"],
          exclude: ["src/**/*.dom.test.ts", "src/test/stories/**"],
        },
      },
      {
        extends: true,
        test: {
          name: "dom",
          environment: "jsdom",
          include: ["src/**/*.test.tsx", "src/**/*.dom.test.ts"],
          setupFiles: ["./src/test/setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "stories",
          environment: "jsdom",
          include: ["src/test/stories/shard-*.test.ts"],
          setupFiles: ["./src/test/setup.ts"],
          sequence: { groupOrder: 1 },
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
    restoreMocks: true,
    unstubGlobals: true,
    unstubEnvs: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/api/generated/**",
        "src/api/schemas/**",
        "src/**/*.d.ts",
        "src/route-tree.gen.ts",
        "src/storybook/**",
        "src/test/**",
        "src/**/*.stories.tsx",
        "src/**/*.test.{ts,tsx}",
        "src/**/index.ts",
      ],
      thresholds: {
        "src/hooks/**": { statements: 83, branches: 79, functions: 63, lines: 88 },
        "src/lib/**": { statements: 85, branches: 83, functions: 90, lines: 91 },
        "src/stores/**": { statements: 95, branches: 92, functions: 95, lines: 96 },
      },
    },
  },
});
