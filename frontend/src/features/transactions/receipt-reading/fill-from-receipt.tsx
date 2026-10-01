import { useMutation } from "@tanstack/react-query";
import { LocateFixed, ScanText } from "lucide-react";
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
import { createTransactionBodyPlaceMax } from "@/api/schemas/transactions/transactions.zod";
import { FormError } from "@/components/form-error/form-error";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { SelectField } from "@/components/select-field/select-field";
import { Button } from "@/components/ui/button/button";
import { FileInput } from "@/components/ui/file-input/file-input";
import { ButtonSkeleton } from "@/components/ui/skeleton/skeleton";
import { ACCEPT_ATTRIBUTE } from "@/features/transactions/transaction-attachments/attachment-files";
import type { TransactionDraft } from "@/features/transactions/transaction-form/transaction-draft";
import type { TransactionFormApi } from "@/features/transactions/transaction-form/use-transaction-form";
import { useUsableCurrencies } from "@/hooks/use-currencies";
import { useFeature } from "@/hooks/use-settings";
import { silentMutation } from "@/lib/mutations";
import { ReceiptReview } from "./receipt-review";
import {
  type CategoryChoice,
  type ReceiptFill,
  linesFromReceipt,
  refundCategory,
} from "./receipt-split";

interface ReceiptSource {
  attachmentId?: string;
  file?: File;
}

export interface ReceiptCandidateSplit {
  candidateId: string;
  draft: TransactionDraft;
  file: File | null;
}

interface Props {
  form: TransactionFormApi;
  categories: CategoryResponse[];
  transactionId?: string;
  onReceiptFile?: (file: File | null) => void;
  onSplitCandidate?: (split: ReceiptCandidateSplit) => void;
}

const DOCUMENT_TYPES = ["text/html", "message/rfc822"];

const DOCUMENT_EXTENSIONS = [".html", ".htm", ".eml"];

const RECEIPT_ACCEPT = [ACCEPT_ATTRIBUTE, ...DOCUMENT_TYPES, ...DOCUMENT_EXTENSIONS].join(",");

function isReceiptDocument(file: File) {
  const name = file.name.toLowerCase();
  return (
    DOCUMENT_TYPES.includes(file.type) ||
    DOCUMENT_EXTENSIONS.some((extension) => name.endsWith(extension))
  );
}

interface PhotoPosition {
  latitude: number;
  longitude: number;
}

function photoPositionOf(reading: ReceiptReadingResponse): PhotoPosition | null {
  const { photoLatitude, photoLongitude } = reading;
  return photoLatitude != null && photoLongitude != null
    ? { latitude: photoLatitude, longitude: photoLongitude }
    : null;
}

function placeOf(result: ReceiptResultResponse): string {
  return [result.merchant, result.address]
    .filter(Boolean)
    .join(", ")
    .slice(0, createTransactionBodyPlaceMax);
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
    <FileInput
      id={id}
      variant="button"
      icon={ScanText}
      placeholder={label}
      accept={RECEIPT_ACCEPT}
      disabled={busy}
      onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (file) {
          onPick(file);
        }
      }}
    />
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
  const locationsEnabled = useFeature("locations");
  const abort = useRef<AbortController | null>(null);
  const [source, setSource] = useState<ReceiptSource | null>(null);
  const [reading, setReading] = useState<ReceiptReadingResponse | null>(null);
  const [photo, setPhoto] = useState<PhotoPosition | null>(null);

  const readMutation = useMutation({
    mutationKey: getReadReceiptMutationKey(),
    ...silentMutation,
    mutationFn: (request: ReadReceiptRequest) => {
      abort.current = new AbortController();
      return readReceipt(request, { signal: abort.current.signal });
    },
  });
  const uploadMutation = useUploadAttachment({ mutation: silentMutation });
  const categoriesMutation = useUpdateReceiptCategories({ mutation: silentMutation });
  const busy = readMutation.isPending || uploadMutation.isPending;

  function read(next: ReceiptSource, force = false) {
    setSource(next);
    readMutation.mutate(
      { attachmentId: next.attachmentId ?? null, file: next.file ?? null, force },
      {
        onSuccess: (answered) => {
          setReading(answered);
          setPhoto(photoPositionOf(answered));
        },
      },
    );
  }

  function pick(file: File) {
    readMutation.reset();
    const document = isReceiptDocument(file);
    if (!transactionId || document) {
      onReceiptFile?.(document ? null : file);
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

  function fillPlace(result: ReceiptResultResponse) {
    const place = placeOf(result);
    if (locationsEnabled && place && !form.getFieldValue("place").trim()) {
      form.setFieldValue("place", place);
    }
  }

  function applyPhotoPosition(position: PhotoPosition) {
    form.setFieldValue("latitude", position.latitude);
    form.setFieldValue("longitude", position.longitude);
    setPhoto(null);
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

  function fillRefund(current: ReceiptReadingResponse, choices: CategoryChoice[]) {
    form.setFieldValue("isSplit", false);
    form.setFieldValue("lines", []);
    form.setFieldValue("categoryId", refundCategory(current.result.items, choices));
    const original = current.refundOf;
    if (original) {
      form.setFieldValue("refundOf", original);
      if (!transactionId && original.description) {
        form.setFieldValue("description", original.description);
      }
    }
    form.setFieldValue("type", "refund");
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
      fillPlace(current.result);
      if (current.result.isReturn) {
        fillRefund(current, choices);
        return;
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
        file: isReceiptDocument(file) ? null : file,
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
      {photo && !reading ? (
        <Button type="button" variant="outline" size="sm" onClick={() => applyPhotoPosition(photo)}>
          <LocateFixed />
          {t("transactions.place.usePhotoLocation")}
        </Button>
      ) : null}

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
