import { createFileRoute } from "@tanstack/react-router";
import { FeaturesPage } from "@/features/landing/features-page/features-page";

export const Route = createFileRoute("/features")({
  component: FeaturesPage,
});
