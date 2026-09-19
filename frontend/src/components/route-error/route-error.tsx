import { useRouter } from "@tanstack/react-router";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/page-header";

interface Props {
  title?: string;
  onRetry?: () => void;
}

export function RouteError({ title, onRetry }: Readonly<Props>) {
  const router = useRouter();

  function retry() {
    onRetry?.();
    void router.invalidate();
  }

  return (
    <div className="space-y-10">
      {title ? <PageHeader title={title} /> : null}
      <section className="section">
        <ErrorState subject={title} onRetry={retry} />
      </section>
    </div>
  );
}
