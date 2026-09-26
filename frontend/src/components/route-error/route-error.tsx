import { useRouter } from "@tanstack/react-router";
import { RotateCw } from "lucide-react";
import { use } from "react";
import { useTranslation } from "react-i18next";
import { BrandMark } from "@/components/brand/brand";
import { RetryContext } from "@/components/error-state/error-state";
import { PageHeader } from "@/components/page-header/page-header";
import { Button } from "@/components/ui/button/button";

interface Props {
  title?: string;
}

function reloadPage() {
  globalThis.location.reload();
}

export function RouteError({ title }: Readonly<Props>) {
  const router = useRouter();
  const { t } = useTranslation();
  const boundaryRetry = use(RetryContext);

  function retry() {
    boundaryRetry?.();
    void router.invalidate();
  }

  const message = (
    <div role="alert" className="max-w-md">
      <h2 className="text-lg leading-6 font-semibold text-balance">
        {title ? t("errors.loadFailedNamed", { subject: title }) : t("errors.pageFailedTitle")}
      </h2>
      <p className="mt-2 text-sm text-pretty text-muted-foreground">{t("errors.pageFailedBody")}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button type="button" onClick={retry}>
          <RotateCw aria-hidden="true" />
          {t("errors.retry")}
        </Button>
        <Button type="button" variant="outline" onClick={reloadPage}>
          {t("errors.reload")}
        </Button>
      </div>
    </div>
  );

  if (title) {
    return (
      <div className="space-y-5">
        <PageHeader title={title} />
        {message}
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-start justify-center gap-6 px-4 py-10">
      <BrandMark className="h-14 opacity-30" />
      {message}
    </div>
  );
}
