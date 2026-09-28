import { useId, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button/button";
import { Input } from "@/components/ui/input/input";
import { useNumberFormat } from "@/hooks/use-formatters";

const GO_TO_PAGE_FROM = 5;

export interface PageRange {
  total: number;
  pageSize: number;
}

interface Props {
  page: number;
  pages: number;
  range?: PageRange;
  onPageChange: (page: number) => void;
}

interface GoToPageProps {
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
}

function GoToPage({ page, pages, onPageChange }: Readonly<GoToPageProps>) {
  const { t } = useTranslation();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);

  function goTo() {
    const typed = input.current?.value.trim() ?? "";
    const target = Math.min(Math.max(Math.trunc(Number(typed)), 1), pages);
    if (typed !== "" && Number.isFinite(target) && target !== page) {
      onPageChange(target);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        goTo();
      }}
      className="flex items-center gap-2 text-muted-foreground tabular-nums"
    >
      <label htmlFor={id}>{t("pagination.page")}</label>
      <Input
        id={id}
        ref={input}
        name="page"
        inputMode="numeric"
        autoComplete="off"
        defaultValue={page}
        aria-describedby={`${id}-pages`}
        className="h-8 w-20 text-right"
      />
      <span id={`${id}-pages`}>{t("pagination.ofPages", { pages })}</span>
    </form>
  );
}

export function Pagination({ page, pages, range, onPageChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const number = useNumberFormat();

  if (pages <= 1) {
    return null;
  }

  const goTo = pages >= GO_TO_PAGE_FROM;
  let summary = goTo ? null : t("pagination.pageOf", { page, pages });
  if (range) {
    summary = t("pagination.range", {
      from: number.format((page - 1) * range.pageSize + 1),
      to: number.format(Math.min(page * range.pageSize, range.total)),
      total: number.format(range.total),
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-sm">
      <span className="text-muted-foreground tabular-nums">{summary}</span>
      <div className="flex flex-wrap items-center gap-2">
        {goTo ? (
          <GoToPage key={page} page={page} pages={pages} onPageChange={onPageChange} />
        ) : null}
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          {t("actions.previous")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          {t("actions.next")}
        </Button>
      </div>
    </div>
  );
}
