import { useForm } from "@tanstack/react-form";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useUpdateCategoryEndpoint } from "@/api/generated";
import type { CategoryResponse } from "@/api/generated/model";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { CategoryIcon } from "@/lib/category-icons";
import { IconPicker } from "./icon-picker";

interface FormValues {
  name: string;
  icon: string | null;
}

interface Props {
  category: CategoryResponse;
  deletePending: boolean;
  onDelete: () => void;
  onSaved: () => void;
}

export function CategoryRow({ category, deletePending, onDelete, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);

  const schema = z.object({
    name: z
      .string()
      .trim()
      .min(1, t("validation.required"))
      .max(100, t("validation.maxLength", { max: 100 })),
    icon: z.string().nullable(),
  });

  const updateMutation = useUpdateCategoryEndpoint({
    mutation: {
      onSuccess: () => setEditing(false),
      onSettled: onSaved,
    },
  });

  const form = useForm({
    defaultValues: {
      name: category.name ?? "",
      icon: category.icon ?? null,
    } satisfies FormValues,
    validators: { onChange: schema },
    onSubmit: ({ value }) => {
      updateMutation.mutate({
        id: category.id!,
        data: { name: value.name.trim(), icon: value.icon },
      });
    },
  });

  if (editing) {
    return (
      <li className="space-y-3 py-3">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
          noValidate
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <form.Field name="name">
              {(field) => (
                <Input
                  value={field.state.value}
                  aria-invalid={field.state.meta.errors.length > 0}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  autoFocus
                />
              )}
            </form.Field>
            <form.Subscribe selector={(state) => state.canSubmit}>
              {(canSubmit) => (
                <Button type="submit" size="sm" disabled={updateMutation.isPending || !canSubmit}>
                  {t("actions.save")}
                </Button>
              )}
            </form.Subscribe>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setEditing(false);
                form.reset();
              }}
            >
              {t("actions.cancel")}
            </Button>
          </div>
          <form.Field name="name">
            {(field) => <FieldError message={field.state.meta.errors[0]?.message} />}
          </form.Field>
          <form.Field name="icon">
            {(field) => <IconPicker value={field.state.value} onChange={field.handleChange} />}
          </form.Field>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-2 py-2.5">
      <div className="flex items-center gap-3">
        <span className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <CategoryIcon icon={category.icon} />
        </span>
        <span className="text-sm font-medium">{category.name}</span>
      </div>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => setEditing(true)}
          aria-label={t("actions.edit")}
          title={t("actions.edit")}
        >
          <Pencil />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          disabled={deletePending}
          onClick={onDelete}
          aria-label={t("actions.delete")}
          title={t("actions.delete")}
        >
          <Trash2 />
        </Button>
      </div>
    </li>
  );
}
