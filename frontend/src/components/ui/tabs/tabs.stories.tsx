import type { Meta, StoryObj } from "@storybook/react-vite";
import { FileUp, RefreshCw } from "lucide-react";
import { Tabs, TabsList, TabsPanel, TabsTab } from "./tabs";

function TabsStory() {
  return (
    <Tabs defaultValue="upload" className="w-full max-w-96">
      <TabsList>
        <TabsTab value="upload">
          <FileUp aria-hidden="true" className="size-4 shrink-0" />
          Upload report
        </TabsTab>
        <TabsTab value="sync">
          <RefreshCw aria-hidden="true" className="size-4 shrink-0" />
          Automatic sync
        </TabsTab>
      </TabsList>
      <TabsPanel value="upload">
        <p className="text-sm">Choose a report file to import.</p>
      </TabsPanel>
      <TabsPanel value="sync">
        <p className="text-sm">Connect the broker for a daily sync.</p>
      </TabsPanel>
    </Tabs>
  );
}

const meta = {
  title: "UI/Tabs",
  component: Tabs,
  render: () => <TabsStory />,
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
