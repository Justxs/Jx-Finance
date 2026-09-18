import { withThemeByClassName } from "@storybook/addon-themes";
import type { Preview } from "@storybook/react-vite";
import { I18nextProvider } from "react-i18next";
import i18n from "../src/lib/i18n";
import "../src/global.css";

const preview: Preview = {
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
  },
  decorators: [
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
          <div className="bg-background p-6 text-foreground">
            <Story />
          </div>
        </I18nextProvider>
      );
    },
  ],
};

export default preview;
