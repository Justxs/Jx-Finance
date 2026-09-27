import { useMyDiscordSuspense } from "@/api/generated";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { SectionSkeleton } from "@/components/ui/skeleton/skeleton";
import { DiscordForm } from "./discord-form";

function DiscordSettings() {
  const saved = useMyDiscordSuspense().data;

  return (
    <DiscordForm
      key={JSON.stringify([saved.hasWebhook, saved.isEnabled, saved.types])}
      settings={saved}
    />
  );
}

export function DiscordSection() {
  return (
    <QueryBoundary fallback={<SectionSkeleton rows={4} />}>
      <DiscordSettings />
    </QueryBoundary>
  );
}
