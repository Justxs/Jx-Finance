import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { shellAria } from "@/components/form/field-shell/field-shell";
import type { TranslationKey } from "@/lib/i18n";
import { type UploadProblem, validateUpload } from "@/lib/upload-file";

export function useFileField(
  id: string,
  maxBytes: number,
  problemKeys: Record<UploadProblem, TranslationKey>,
) {
  const { t } = useTranslation();
  const ref = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | undefined>(undefined);
  const [key, setKey] = useState(0);

  function take() {
    const file = ref.current?.files?.[0];
    const problem = validateUpload(file, maxBytes);
    if (!file || problem) {
      setError(t(problemKeys[problem ?? "required"]));
      return null;
    }
    setError(undefined);
    return file;
  }

  function clearError() {
    setError(undefined);
  }

  function reset() {
    setError(undefined);
    setKey((current) => current + 1);
  }

  return {
    key,
    error,
    inputProps: { id, ref, ...shellAria({ id, hint: true, error }) },
    take,
    clearError,
    reset,
  };
}
