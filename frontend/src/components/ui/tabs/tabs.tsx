import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cn } from "@/lib/utils";

function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col", className)} {...props} />
  );
}

const tabsListClass = "relative flex gap-x-5 overflow-x-auto shadow-[inset_0_-1px_0_var(--rule)]";

const tabsTabClass =
  "inline-flex h-9 shrink-0 items-center gap-2 text-sm font-medium whitespace-nowrap text-muted-foreground transition-[color,font-weight] duration-base ease-out-expo hover:text-foreground focus-ring-inset data-active:font-semibold data-active:text-foreground data-disabled:pointer-events-none data-disabled:not-data-active:opacity-50 pointer-coarse:h-11";

function TabsList({ className, children, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List data-slot="tabs-list" className={cn(tabsListClass, className)} {...props}>
      {children}
      <TabsPrimitive.Indicator
        data-slot="tabs-indicator"
        className="absolute bottom-0 left-(--active-tab-left) h-0.5 w-(--active-tab-width) bg-foreground transition-[left,width] duration-slow ease-out-expo"
      />
    </TabsPrimitive.List>
  );
}

function TabsTab({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab data-slot="tabs-tab" className={cn(tabsTabClass, className)} {...props} />
  );
}

function TabsPanel({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-panel"
      className={cn("rounded-sm pt-5 focus-ring", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsPanel, TabsTab, tabsListClass, tabsTabClass };
