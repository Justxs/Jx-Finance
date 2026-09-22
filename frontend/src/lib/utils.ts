import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function metaLine(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" · ");
}
