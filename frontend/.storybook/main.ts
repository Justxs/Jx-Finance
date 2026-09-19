import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.tsx"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-themes", "msw-storybook-addon"],
  staticDirs: [
    "./public",
    { from: "../public/favicon.svg", to: "/favicon.svg" },
    { from: "../public/splash.css", to: "/splash.css" },
    { from: "../public/brand/mark.svg", to: "/brand/mark.svg" },
  ],
  framework: { name: "@storybook/react-vite", options: {} },
  core: { disableTelemetry: true },
  viteFinal(viteConfig) {
    viteConfig.plugins = (viteConfig.plugins ?? [])
      .flat()
      .filter(
        (plugin) =>
          !(plugin && "name" in plugin && String(plugin.name).includes("tanstack-router")),
      );
    return viteConfig;
  },
};

export default config;
