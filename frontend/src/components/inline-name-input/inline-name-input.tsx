import { X } from "lucide-react";
import { type ReactNode, type SyntheticEvent, useState } from "react";
import { Button } from "@/components/ui/button/button";
import { Input } from "@/components/ui/input/input";
import { cn } from "@/lib/utils";

interface Props {
  label?: string;
  submitLabel?: string;
  maxLength: number;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  submitIcon?: ReactNode;
  cancelLabel?: string;
  onSubmit: (name: string) => void;
  onCancel?: () => void;
  className?: string;
}

export function InlineNameInput({
  label,
  submitLabel,
  maxLength,
  defaultValue = "",
  placeholder,
  disabled = false,
  submitIcon,
  cancelLabel,
  onSubmit,
  onCancel,
  className,
}: Readonly<Props>) {
  const [name, setName] = useState(defaultValue);
  const blank = !name.trim();

  function handleSubmit(event: SyntheticEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (disabled || blank) {
      return;
    }
    onSubmit(name);
    setName("");
  }

  return (
    <form className={cn("flex items-center", className)} onSubmit={handleSubmit}>
      <Input
        aria-label={label}
        value={name}
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={disabled}
        className="h-8 min-w-0 flex-1"
        onChange={(event) => setName(event.target.value)}
      />
      {submitIcon ? (
        <Button
          type="submit"
          variant="ghost"
          size="icon-sm"
          disabled={disabled || blank}
          aria-label={submitLabel}
        >
          {submitIcon}
        </Button>
      ) : (
        <Button type="submit" variant="outline" size="sm" disabled={disabled || blank}>
          {submitLabel}
        </Button>
      )}
      {onCancel ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={cancelLabel}
          onClick={onCancel}
        >
          <X />
        </Button>
      ) : null}
    </form>
  );
}
