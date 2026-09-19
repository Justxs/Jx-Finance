import "../src/global.css";
import { withThemeByClassName } from "@storybook/addon-themes";
import type { Preview } from "@storybook/react-vite";
import { isCommonAssetRequest } from "msw";
import { mswLoader } from "msw-storybook-addon/csf3";
import { I18nextProvider } from "react-i18next";
import { configure } from "storybook/test";
import { i18n } from "../src/lib/i18n";
import { withAppProviders } from "../src/storybook/decorators";
import { handlers } from "../src/storybook/handlers";

const WORKER_URL = "/mockServiceWorker.js";
const CONTROLLER_WAIT_MS = 3000;
const WORKER_START_WAIT_MS = 3000;
const WORKER_START_ATTEMPTS = 3;
const STORYBOOK_REQUEST =
  /\.eot$|\.mdx$|sb-common-assets|__webpack_hmr|iframe\.html|sb-vite|@vite|@react-refresh|\/virtual:|\.stories\./;

configure({ asyncUtilTimeout: 5000 });

function waitForController() {
  if (navigator.serviceWorker.controller) {
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, CONTROLLER_WAIT_MS);
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

function settlesWithin(task: Promise<unknown>, ms: number) {
  return Promise.race([
    task.then(() => true),
    new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(false), ms);
    }),
  ]);
}

async function startMockWorker() {
  const { setupWorker } = await import("msw/browser");
  await navigator.serviceWorker.register(WORKER_URL);
  await settlesWithin(navigator.serviceWorker.ready, WORKER_START_WAIT_MS);
  await waitForController();
  const worker = setupWorker();
  const options = {
    quiet: true,
    serviceWorker: { url: WORKER_URL },
    onUnhandledRequest(request: Request, print: { warning: () => void }) {
      if (isCommonAssetRequest(request) || STORYBOOK_REQUEST.test(request.url)) {
        return;
      }
      print.warning();
    },
  };

  async function attemptStart(attempt: number): Promise<typeof worker> {
    if (await settlesWithin(worker.start(options), WORKER_START_WAIT_MS)) {
      return worker;
    }
    if (attempt >= WORKER_START_ATTEMPTS) {
      throw new Error("The mock service worker did not start.");
    }
    console.warn(`[storybook] mock worker start attempt ${attempt} timed out`);
    worker.stop();
    return attemptStart(attempt + 1);
  }

  return attemptStart(1);
}

const preview: Preview = {
  loaders: [
    mswLoader(startMockWorker),
    async function localeLoader(context) {
      if (i18n.language !== context.globals.locale) {
        await i18n.changeLanguage(context.globals.locale);
      }
      return {};
    },
  ],
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
