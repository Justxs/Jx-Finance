import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["2xs", "page-title", "stat", "stat-lg"],
    },
    classGroups: {
      duration: [{ duration: ["quick", "base", "view", "slow"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function metaLine(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" · ");
}
