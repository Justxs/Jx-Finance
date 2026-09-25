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
import { ${component} } from "./${name}";

const meta = {
  title: "Features/${pascal(feature)}/${component}",
  component: ${component},
  args: { title: "${component}" },
} satisfies Meta<typeof ${component}>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
`,
  [`${name}.test.tsx`]: `import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { createQueryWrapper } from "@/test/query";
import { ${component} } from "./${name}";

test("renders its title", () => {
  const { Wrapper } = createQueryWrapper();

  render(<${component} title="Example" />, { wrapper: Wrapper });

  expect(screen.getByRole("heading", { name: "Example" })).toBeInTheDocument();
});
`,
});
