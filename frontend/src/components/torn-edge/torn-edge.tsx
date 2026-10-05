import { useId } from "react";

export function TornEdge() {
  const patternId = useId();

  return (
    <svg
      aria-hidden="true"
      className="hero-edge pointer-events-none absolute inset-x-0 top-full -z-10 block h-3 w-full text-hero"
    >
      <defs>
        <pattern id={patternId} width="24" height="12" patternUnits="userSpaceOnUse">
          <path d="M 0 0 H 24 L 12 12 Z" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}
