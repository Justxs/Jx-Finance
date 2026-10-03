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

export default {
  meta: { name: "jx-code" },
  rules: {
    "no-cross-feature-import": noCrossFeatureImport,
    "no-key-listener": noKeyListener,
  },
};
