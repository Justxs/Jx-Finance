import { join } from "node:path";
import { fail, root, scaffold } from "./run.mjs";

const [feature, name] = process.argv.slice(2);
const kebab = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

if (!feature || !name || !kebab.test(feature) || !kebab.test(name)) {
  fail("Usage: just new-component <feature> <component-name>, both in kebab-case\nExample: just new-component goals goal-archive-dialog");
}

function pascal(value) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

const component = pascal(name);

scaffold(join(root, "frontend", "src", "features", feature, name), {
  [`${name}.tsx`]: `interface ${component}Props {
  title: string;
}

export function ${component}({ title }: ${component}Props) {
  return (
    <section aria-label={title}>
      <h2>{title}</h2>
    </section>
  );
}
`,
  [`${name}.stories.tsx`]: `import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { emptyHandlers, errorHandlers, loadingHandlers } from "@/storybook/handlers";
import { ${component} } from "./${name}";

const meta = {
  title: "Features/${pascal(feature)}/${component}",
  component: ${component},
  args: { title: "${component}" },
} satisfies Meta<typeof ${component}>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "${component}" })).toBeVisible();
  },
};

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };
`,
  [`${name}.test.tsx`]: `import { screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { mockApi, renderInApp } from "@/test/api";
import { ${component} } from "./${name}";

const api = mockApi();

test("shows its title without writing anything", async () => {
  renderInApp(<${component} title="Example" />);

  expect(await screen.findByRole("heading", { name: "Example" })).toBeInTheDocument();
  expect(api.sent("POST", "/api/${feature}")).toHaveLength(0);
});
`,
});
