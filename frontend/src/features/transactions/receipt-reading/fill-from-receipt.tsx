import { useMutation } from "@tanstack/react-query";
import { ScanText } from "lucide-react";
import { useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getReadReceiptMutationKey,
  readReceipt,
  useAttachmentsSuspense,
  useUpdateReceiptCategories,
  useUploadAttachment,
} from "@/api/generated";
import type {
  CategoryResponse,
  ReadReceiptRequest,
  ReceiptCandidateResponse,
  ReceiptReadingResponse,
  ReceiptResultResponse,
} from "@/api/generated/model";
import { FormError } from "@/components/form-error/form-error";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { SelectField } from "@/components/select-field/select-field";
import { Button, buttonVariants } from "@/components/ui/button/button";
import { ButtonSkeleton } from "@/components/ui/skeleton/skeleton";
import { useUsableCurrencies } from "@/hooks/use-formatters";
import { silent } from "@/lib/mutations";
import { cn } from "@/lib/utils";
import { ACCEPT_ATTRIBUTE } from "../transaction-attachments/attachment-files";
import type { TransactionDraft } from "../transaction-form/transaction-draft";
import type { TransactionFormApi } from "../transaction-form/use-transaction-form";
import { ReceiptReview } from "./receipt-review";
import { type CategoryChoice, type ReceiptFill, linesFromReceipt } from "./receipt-split";

interface ReceiptSource {
  attachmentId?: string;
  file?: File;
}

export interface ReceiptCandidateSplit {
  candidateId: string;
  draft: TransactionDraft;
  file: File;
}

interface Props {
  form: TransactionFormApi;
  categories: CategoryResponse[];
  transactionId?: string;
  onReceiptFile?: (file: File) => void;
  onSplitCandidate?: (split: ReceiptCandidateSplit) => void;
}

interface FilePickerProps {
  label: string;
  busy: boolean;
  onPick: (file: File) => void;
}

interface AttachmentPickerProps {
  transactionId: string;
  busy: boolean;
  onRead: (attachmentId: string) => void;
  onPick: (file: File) => void;
}

function draftOf(fill: ReceiptFill): TransactionDraft {
  return "lines" in fill
    ? {
        isSplit: true,
        categoryId: null,
        lines: fill.lines.map((line) => ({
          categoryId: line.categoryId || null,
          amount: line.amount,
          description: line.description,
        })),
      }
    : { isSplit: false, categoryId: fill.categoryId || null, lines: null };
}

function FilePicker({ label, busy, onPick }: Readonly<FilePickerProps>) {
  const id = useId();

  return (
    <label
      htmlFor={id}
      className={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        "cursor-pointer has-focus-visible:border-ring has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
        busy && "pointer-events-none opacity-50",
      )}
    >
      <ScanText />
      {label}
      <input
        id={id}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        className="sr-only"
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) {
            onPick(file);
          }
        }}
      />
    </label>
  );
}

function AttachmentPicker({
  transactionId,
  busy,
  onRead,
  onPick,
}: Readonly<AttachmentPickerProps>) {
  const { t } = useTranslation();
  const attachments = useAttachmentsSuspense(transactionId).data.toSorted((a, b) =>
    b.uploadedAt.localeCompare(a.uploadedAt),
  );
  const [selected, setSelected] = useState<string | null>(null);
  const current = attachments.find((attachment) => attachment.id === selected) ?? attachments[0];

  if (!current) {
    return <FilePicker label={t("receipts.fill")} busy={busy} onPick={onPick} />;
  }

  return (
    <>
      <SelectField
        value={current.id}
        onChange={setSelected}
        options={attachments.map((attachment) => ({
          value: attachment.id,
          label: attachment.fileName,
        }))}
        size="sm"
        className="max-w-64"
        aria-label={t("receipts.file")}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        pending={busy}
        onClick={() => onRead(current.id)}
      >
        <ScanText />
        {t("receipts.fill")}
      </Button>
      <FilePicker label={t("receipts.chooseFile")} busy={busy} onPick={onPick} />
    </>
  );
}

export function FillFromReceipt({
  form,
  categories,
  transactionId,
  onReceiptFile,
  onSplitCandidate,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const usableCurrencies = useUsableCurrencies();
  const abort = useRef<AbortController | null>(null);
  const [source, setSource] = useState<ReceiptSource | null>(null);
  const [reading, setReading] = useState<ReceiptReadingResponse | null>(null);

  const readMutation = useMutation({
    mutationKey: getReadReceiptMutationKey(),
    meta: { silent: true },
    mutationFn: (request: ReadReceiptRequest) => {
      abort.current = new AbortController();
      return readReceipt(request, { signal: abort.current.signal });
    },
  });
  const uploadMutation = useUploadAttachment(silent());
  const categoriesMutation = useUpdateReceiptCategories(silent());
  const busy = readMutation.isPending || uploadMutation.isPending;

  function read(next: ReceiptSource, force = false) {
    setSource(next);
    readMutation.mutate(
      { attachmentId: next.attachmentId ?? null, file: next.file ?? null, force },
      { onSuccess: setReading },
    );
  }

  function pick(file: File) {
    readMutation.reset();
    if (!transactionId) {
      onReceiptFile?.(file);
      read({ file });
      return;
    }

    uploadMutation.mutate(
      { transactionId, data: { file } },
      { onSuccess: (attachment) => read({ attachmentId: attachment.id }) },
    );
  }

  function cancel() {
    abort.current?.abort();
    readMutation.reset();
  }

  function fillDetails(result: ReceiptResultResponse) {
    if (result.total) {
      form.setFieldValue("amount", result.total);
    }
    if (result.currency && usableCurrencies.includes(result.currency)) {
      form.setFieldValue("currency", result.currency);
    }
    if (result.date) {
      form.setFieldValue("date", result.date);
    }
    if (result.merchant) {
      form.setFieldValue("description", result.merchant);
    }
  }

  function fillLines(fill: ReceiptFill) {
    if ("lines" in fill) {
      form.setFieldValue("categoryId", "");
      form.setFieldValue("lines", fill.lines);
      form.setFieldValue("isSplit", true);
      return;
    }
    form.setFieldValue("isSplit", false);
    form.setFieldValue("lines", []);
    form.setFieldValue("categoryId", fill.categoryId);
  }

  function remember(current: ReceiptReadingResponse, choices: CategoryChoice[], then: () => void) {
    categoriesMutation.mutate(
      {
        id: current.id,
        data: { items: choices.map((categoryId, index) => ({ index, categoryId })) },
      },
      {
        onSuccess: () => {
          then();
          setReading(null);
        },
      },
    );
  }

  function apply(current: ReceiptReadingResponse, choices: CategoryChoice[]) {
    remember(current, choices, () => {
      if (!transactionId) {
        fillDetails(current.result);
      }
      fillLines(linesFromReceipt(current.result, choices, form.getFieldValue("amount")));
    });
  }

  function splitCandidate(
    current: ReceiptReadingResponse,
    candidate: ReceiptCandidateResponse,
    choices: CategoryChoice[],
  ) {
    const file = source?.file;
    if (!file) {
      return;
    }
    remember(current, choices, () =>
      onSplitCandidate?.({
        candidateId: candidate.id,
        draft: draftOf(linesFromReceipt(current.result, choices, candidate.amount)),
        file,
      }),
    );
  }

  return (
    <div className="col-span-full space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        {transactionId ? (
          <QueryBoundary fallback={<ButtonSkeleton size="sm" className="w-40" />}>
            <AttachmentPicker
              transactionId={transactionId}
              busy={busy}
              onRead={(attachmentId) => {
                readMutation.reset();
                read({ attachmentId });
              }}
              onPick={pick}
            />
          </QueryBoundary>
        ) : (
          <FilePicker
            label={busy ? t("receipts.reading") : t("receipts.fill")}
            busy={busy}
            onPick={pick}
          />
        )}
        {readMutation.isPending ? (
          <Button type="button" variant="ghost" size="sm" onClick={cancel}>
            {t("actions.cancel")}
          </Button>
        ) : null}
      </div>
      {busy ? (
        <p role="status" className="text-xs text-muted-foreground">
          {t("receipts.readingHint")}
        </p>
      ) : null}
      {reading ? null : <FormError error={readMutation.error ?? uploadMutation.error} />}

      {reading ? (
        <form.Subscribe selector={(state) => [state.values.amount, state.values.currency] as const}>
          {([amount, currency]) => (
            <ReceiptReview
              key={reading.id}
              reading={reading}
              categories={categories}
              amount={transactionId ? amount : (reading.result.total ?? amount)}
              currency={currency}
              pending={categoriesMutation.isPending}
              readAgainPending={readMutation.isPending}
              error={categoriesMutation.error ?? readMutation.error}
              onApply={(choices) => apply(reading, choices)}
              onReadAgain={() => {
                if (source) {
                  read(source, true);
                }
              }}
              onSplitCandidate={
                onSplitCandidate && source?.file
                  ? (candidate, choices) => splitCandidate(reading, candidate, choices)
                  : undefined
              }
              onClose={() => setReading(null)}
            />
          )}
        </form.Subscribe>
      ) : null}
    </div>
  );
}
