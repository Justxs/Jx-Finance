import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/features/landing/landing-page/landing-page";

export const Route = createFileRoute("/welcome")({
  component: LandingPage,
});
