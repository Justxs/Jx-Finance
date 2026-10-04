import path from "node:path";

const FEATURE_FILE = /\/src\/features\/([^/]+)\//;
const FEATURES_ROOT = "/src/features/";
const KEY_EVENTS = new Set(["keydown", "keyup", "keypress"]);

function posixPath(file) {
  return file.replaceAll("\\", "/");
}

function featureTarget(specifier, file) {
  if (specifier.startsWith("@/features/")) {
    return specifier.slice("@/features/".length);
  }
  if (!specifier.startsWith(".")) {
    return undefined;
  }
  const resolved = path.posix.join(path.posix.dirname(file), specifier);
  const index = resolved.indexOf(FEATURES_ROOT);
  return index === -1 ? undefined : resolved.slice(index + FEATURES_ROOT.length);
}

const noCrossFeatureImport = {
  meta: {
    type: "problem",
    docs: { description: "Disallow a feature importing from another feature." },
    schema: [
      {
        type: "object",
        properties: {
          allow: {
            type: "object",
            additionalProperties: { type: "array", items: { type: "string" } },
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      crossFeature:
        "`{{feature}}` imports `{{target}}` from another feature. Move a piece two features share to src/components (UI) or src/lib (helpers); only the page-level entries in the allowlist of .oxlintrc.json may cross features.",
    },
  },
  create(context) {
    const file = posixPath(context.filename);
    const feature = FEATURE_FILE.exec(file)?.[1];
    if (!feature) {
      return {};
    }
    const allowed = new Set(context.options[0]?.allow?.[feature] ?? []);

    function check(source) {
      if (source?.type !== "Literal" || typeof source.value !== "string") {
        return;
      }
      const target = featureTarget(source.value, file);
      if (!target || target.split("/")[0] === feature || allowed.has(target)) {
        return;
      }
      context.report({ node: source, messageId: "crossFeature", data: { feature, target } });
    }

    return {
      ImportDeclaration(node) {
        check(node.source);
      },
      ExportNamedDeclaration(node) {
        check(node.source);
      },
      ExportAllDeclaration(node) {
        check(node.source);
      },
      ImportExpression(node) {
        check(node.source);
      },
    };
  },
};

const noKeyListener = {
  meta: {
    type: "problem",
    docs: { description: "Disallow raw keyboard event listeners." },
    messages: {
      keyListener:
        "Keyboard shortcuts go through TanStack Hotkeys (`useHotkey`, global ones in src/lib/shortcuts.ts), not a raw `{{event}}` listener.",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const [event] = node.arguments;
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.property.type === "Identifier" &&
          node.callee.property.name === "addEventListener" &&
          event?.type === "Literal" &&
          KEY_EVENTS.has(event.value)
        ) {
          context.report({ node, messageId: "keyListener", data: { event: event.value } });
        }
      },
    };
  },
};

const BROWSER_APIS = new Map([
  ["localStorage", "storage"],
  ["sessionStorage", "storage"],
  ["setTimeout", "timer"],
  ["setInterval", "timer"],
]);
const GLOBAL_OBJECTS = new Set(["window", "globalThis"]);

function propertyName(node) {
  if (!node.computed && node.property.type === "Identifier") {
    return node.property.name;
  }
  return node.property.type === "Literal" ? node.property.value : undefined;
}

const noRawBrowserApi = {
  meta: {
    type: "problem",
    docs: { description: "Disallow raw browser storage and timers." },
    messages: {
      storage:
        "Browser storage goes through browserStorage() in src/lib/browser-storage.ts and TanStack DB local-storage collections, not `{{name}}`.",
      timer:
        "Debounce and throttle through TanStack Pacer (useDebouncer, useThrottler) and derive state during render instead of `{{name}}`.",
    },
  },
  create(context) {
    function report(node, name) {
      context.report({ node, messageId: BROWSER_APIS.get(name), data: { name } });
    }

    return {
      Program(node) {
        const globalScope = context.sourceCode.getScope(node);
        const implicit = globalScope.variables.filter(
          (variable) => variable.defs.length === 0 && BROWSER_APIS.has(variable.name),
        );
        for (const reference of [
          ...implicit.flatMap((variable) => variable.references),
          ...globalScope.through,
        ]) {
          if (BROWSER_APIS.has(reference.identifier.name)) {
            report(reference.identifier, reference.identifier.name);
          }
        }
      },
      MemberExpression(node) {
        const name = propertyName(node);
        if (
          node.object.type === "Identifier" &&
          GLOBAL_OBJECTS.has(node.object.name) &&
          BROWSER_APIS.has(name)
        ) {
          report(node, name);
        }
      },
    };
  },
};

const UI_FILE = /\/src\/components\/ui\//;
const SHARED_FILE = /\/src\/(components|lib|hooks|stores)\//;
const APP_STATE_IMPORT = /^@\/(api|features|hooks|stores)\//;

function layerViolation(file, specifier) {
  if (UI_FILE.test(file)) {
    if (APP_STATE_IMPORT.test(specifier)) {
      return "ui";
    }
    return specifier.startsWith("@/components/") && !specifier.startsWith("@/components/ui/")
      ? "ui"
      : undefined;
  }
  return SHARED_FILE.test(file) && specifier.startsWith("@/features/") ? "shared" : undefined;
}

const layerImports = {
  meta: {
    type: "problem",
    docs: { description: "Keep shared layers independent of features and app state." },
    messages: {
      ui: "UI primitives take everything they show as props; read settings, queries and stores in a wrapper outside components/ui instead of importing `{{specifier}}`.",
      shared:
        "Shared code in components, lib, hooks and stores must not depend on a feature; move the shared piece out of `{{specifier}}` instead.",
    },
  },
  create(context) {
    const file = posixPath(context.filename);

    function check(source) {
      if (source?.type !== "Literal" || typeof source.value !== "string") {
        return;
      }
      const messageId = layerViolation(file, source.value);
      if (messageId) {
        context.report({ node: source, messageId, data: { specifier: source.value } });
      }
    }

    return {
      ImportDeclaration(node) {
        check(node.source);
      },
      ExportNamedDeclaration(node) {
        check(node.source);
      },
      ExportAllDeclaration(node) {
        check(node.source);
      },
      ImportExpression(node) {
        check(node.source);
      },
    };
  },
};

const noComments = {
  meta: {
    type: "suggestion",
    docs: { description: "Disallow code comments." },
    messages: {
      comment:
        "No comments in code: use clearer names or a smaller function, and put any explanation in docs/.",
    },
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (!comment.value.startsWith("/ <reference ")) {
            context.report({ loc: comment.loc, messageId: "comment" });
          }
        }
      },
    };
  },
};

export default {
  meta: { name: "jx-code" },
  rules: {
    "no-comments": noComments,
    "no-cross-feature-import": noCrossFeatureImport,
    "no-key-listener": noKeyListener,
    "no-raw-browser-api": noRawBrowserApi,
    "layer-imports": layerImports,
  },
};
