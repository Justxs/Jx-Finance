import { useRouter } from "@tanstack/react-router";
import { ErrorState } from "@/components/error-state";

export function RouteError() {
  const router = useRouter();

  return (
    <section className="card">
      <ErrorState onRetry={() => void router.invalidate()} />
    </section>
  );
}
