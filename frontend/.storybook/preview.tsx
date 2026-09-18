import "../src/global.css";
import { withThemeByClassName } from "@storybook/addon-themes";
import type { Preview } from "@storybook/react-vite";
import { mswLoader } from "msw-storybook-addon/csf3";
import { I18nextProvider } from "react-i18next";
import { i18n } from "../src/lib/i18n";
import { withAppProviders } from "../src/storybook/decorators";
import { handlers } from "../src/storybook/handlers";

const preview: Preview = {
  loaders: [mswLoader()],
  globalTypes: {
    locale: {
      description: "Language",
      toolbar: {
        icon: "globe",
        items: [
          { value: "en", title: "English" },
          { value: "lt", title: "Lietuvių" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { locale: "en" },
  parameters: {
    layout: "centered",
    a11y: { test: "todo" },
    controls: { expanded: true },
    msw: { handlers },
  },
  decorators: [
    withAppProviders,
    withThemeByClassName({
      themes: { light: "", dark: "dark" },
      defaultTheme: "light",
    }),
    function withLocale(Story, context) {
      if (i18n.language !== context.globals.locale) {
        void i18n.changeLanguage(context.globals.locale);
      }
      return (
        <I18nextProvider i18n={i18n}>
          <div
            className={
              context.parameters.layout === "fullscreen"
                ? "bg-background text-foreground"
                : "bg-background p-6 text-foreground"
            }
          >
            <Story />
          </div>
        </I18nextProvider>
      );
    },
  ],
};

export default preview;
