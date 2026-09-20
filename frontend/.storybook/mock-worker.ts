import { isCommonAssetRequest } from "msw";
import { mswLoader } from "msw-storybook-addon/csf3";

const WORKER_URL = "/mockServiceWorker.js";
const CONTROLLER_WAIT_MS = 3000;
const WORKER_START_WAIT_MS = 3000;
const WORKER_START_ATTEMPTS = 3;
const STORYBOOK_REQUEST =
  /\.eot$|\.mdx$|sb-common-assets|__webpack_hmr|iframe\.html|sb-vite|@vite|@react-refresh|\/virtual:|\.stories\./;

export function warnAboutUnhandledRequest(request: Request, print: { warning: () => void }) {
  if (isCommonAssetRequest(request) || STORYBOOK_REQUEST.test(request.url)) {
    return;
  }
  print.warning();
}

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
    onUnhandledRequest: warnAboutUnhandledRequest,
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

export const mockWorkerLoader = mswLoader(startMockWorker);
