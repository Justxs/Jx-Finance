const INTERACTIVE_ELEMENTS = new Set(["a", "button", "input", "select", "textarea", "summary"]);
const INTERACTIVE_ROLES = new Set([
  "button",
  "checkbox",
  "link",
  "menuitem",
  "option",
  "radio",
  "switch",
  "tab",
]);
const NUMBER_LIKE = /^[\d.,\s-]+$/;
const SEPARATOR = /\d[.,\s]/;

function utilityOf(token) {
  return token.slice(token.lastIndexOf(":") + 1).replace(/^!|!$/g, "");
}

function tokensOf(text) {
  return text.split(/\s+/).filter(Boolean).map(utilityOf);
}

function classRule(description, message, matches) {
  return {
    meta: { type: "problem", docs: { description }, messages: { forbidden: message } },
    create(context) {
      function check(node, text) {
        for (const utility of tokensOf(text)) {
          if (matches(utility)) {
            context.report({ node, messageId: "forbidden", data: { utility } });
          }
        }
      }

      return {
        Literal(node) {
          if (typeof node.value === "string") {
            check(node, node.value);
          }
        },
        TemplateElement(node) {
          check(node, node.value.cooked ?? node.value.raw);
        },
      };
    },
  };
}

function attributeOf(element, name) {
  return element.attributes.find(
    (attribute) => attribute.type === "JSXAttribute" && attribute.name.name === name,
  );
}

function staticValueOf(attribute) {
  const value = attribute?.value;
  if (value?.type === "Literal") {
    return value.value;
  }
  if (value?.type === "JSXExpressionContainer" && value.expression.type === "Literal") {
    return value.expression.value;
  }
  return undefined;
}

function isTextExpression(expression) {
  if (expression.type === "Literal") {
    return typeof expression.value === "string" && expression.value.trim() !== "";
  }
  if (expression.type === "TemplateLiteral") {
    return true;
  }
  return (
    expression.type === "CallExpression" &&
    expression.callee.type === "Identifier" &&
    expression.callee.name === "t"
  );
}

function isTextChild(child) {
  if (child.type === "JSXText") {
    return child.value.trim() !== "";
  }
  return child.type === "JSXExpressionContainer" && isTextExpression(child.expression);
}

function isIntrinsic(element) {
  return element.name.type === "JSXIdentifier" && /^[a-z]/.test(element.name.name);
}

function isInteractive(element) {
  return (
    INTERACTIVE_ELEMENTS.has(element.name.name) ||
    attributeOf(element, "onClick") !== undefined ||
    INTERACTIVE_ROLES.has(staticValueOf(attributeOf(element, "role")))
  );
}

const noRoundedFull = classRule(
  "Disallow rounded-full outside the circles DESIGN.md names.",
  "`{{utility}}`: DESIGN.md Shapes allows no pills and no circular tiles; controls and panels use rounded-lg, tags rounded-sm, meters stay square. Only the circles DESIGN.md names (splash ring, collapse handle, bell count, chart dot swatch, circular-icon skeletons) are allowed, by file, in .oxlintrc.json.",
  (utility) => /^rounded(-[a-z]{1,2})?-full$/.test(utility),
);

const noTransitionAll = classRule(
  "Disallow transition-all.",
  "`{{utility}}`: DESIGN.md Elevation & Depth keeps motion quiet; transition only the properties that change (transition-colors, transition-opacity, transition-transform, transition-width, transition-reveal or transition-[...]).",
  (utility) => utility === "transition-all",
);

const noDestructiveText = classRule(
  "Disallow the destructive fill colour as text colour.",
  "`{{utility}}`: DESIGN.md Do's and Don'ts: destructive is a fill colour and fails text contrast in the dark theme; use text-expense for error, warning and removal text.",
  (utility) => /^text-destructive(\/\d+)?$/.test(utility),
);

const noTextGhostButton = {
  meta: {
    type: "problem",
    docs: { description: "Disallow ghost buttons with a text label." },
    messages: {
      textGhost:
        'DESIGN.md Buttons and inputs: only icon-only buttons are ghost. A button with a text label is primary, destructive, outline or outline-destructive; use variant="outline" (or a link variant for an inline text action).',
    },
  },
  create(context) {
    return {
      JSXElement(node) {
        const opening = node.openingElement;
        if (
          opening.name.type === "JSXIdentifier" &&
          opening.name.name === "Button" &&
          staticValueOf(attributeOf(opening, "variant")) === "ghost" &&
          node.children.some(isTextChild)
        ) {
          context.report({ node: opening, messageId: "textGhost" });
        }
      },
    };
  },
};

const noNativeTitle = {
  meta: {
    type: "problem",
    docs: { description: "Disallow the native title attribute on interactive elements." },
    messages: {
      nativeTitle:
        "DESIGN.md Buttons and inputs: a control shows its hint through the app Tooltip (Button takes `tooltip`, an icon Button uses its aria-label), never the native title attribute. title stays only on non-interactive text that truncates.",
    },
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        const title = attributeOf(node, "title");
        if (title && isIntrinsic(node) && isInteractive(node)) {
          context.report({ node: title, messageId: "nativeTitle" });
        }
      },
    };
  },
};

const noLiteralNumberPlaceholder = {
  meta: {
    type: "problem",
    docs: { description: "Disallow literal decimal numbers as placeholders." },
    messages: {
      literalNumber:
        "Placeholder `{{value}}` hard-codes a decimal or group separator and ignores the reader's locale. MoneyInputField and MoneyAmountField already show the locale-formatted zero; otherwise format the number with useNumberFormat or useRateFormat.",
    },
  },
  create(context) {
    return {
      JSXAttribute(node) {
        const value = node.name.name === "placeholder" ? staticValueOf(node) : undefined;
        if (typeof value === "string" && NUMBER_LIKE.test(value) && SEPARATOR.test(value)) {
          context.report({ node, messageId: "literalNumber", data: { value } });
        }
      },
    };
  },
};

export default {
  meta: { name: "jx" },
  rules: {
    "no-rounded-full": noRoundedFull,
    "no-text-ghost-button": noTextGhostButton,
    "no-native-title": noNativeTitle,
    "no-transition-all": noTransitionAll,
    "no-literal-number-placeholder": noLiteralNumberPlaceholder,
    "no-destructive-text": noDestructiveText,
  },
};
