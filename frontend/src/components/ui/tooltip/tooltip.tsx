import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import * as React from "react";
import { cn } from "@/lib/utils";

function TooltipProvider({
  delay = 400,
  closeDelay = 0,
  ...props
}: TooltipPrimitive.Provider.Props) {
  return <TooltipPrimitive.Provider delay={delay} closeDelay={closeDelay} {...props} />;
}

function TooltipContent({
  className,
  align = "center",
  alignOffset = 0,
  side = "top",
  sideOffset = 6,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<TooltipPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset">) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50"
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            "z-50 w-fit max-w-64 origin-(--transform-origin) rounded-md bg-foreground px-2.5 py-1.5 text-xs text-balance wrap-break-word text-background shadow-md duration-100 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-instant:duration-0 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
            className,
          )}
          {...props}
        />
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

function Tooltip({
  content,
  children,
  side,
  align,
  sideOffset,
  ...props
}: Omit<TooltipPrimitive.Root.Props, "children"> &
  Pick<TooltipPrimitive.Positioner.Props, "align" | "side" | "sideOffset"> & {
    content: React.ReactNode;
    children: React.ReactElement<Record<string, unknown>>;
  }) {
  if (content === null || content === undefined || content === false || content === "") {
    return children;
  }

  return (
    <TooltipPrimitive.Root data-slot="tooltip" {...props}>
      <TooltipPrimitive.Trigger data-slot="tooltip-trigger" render={children} />
      <TooltipContent side={side} align={align} sideOffset={sideOffset}>
        {content}
      </TooltipContent>
    </TooltipPrimitive.Root>
  );
}

export { Tooltip, TooltipContent, TooltipProvider };
