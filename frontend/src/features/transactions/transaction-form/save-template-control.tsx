import { BookmarkPlus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button/button";
import { Input } from "@/components/ui/input/input";
import { Label } from "@/components/ui/label/label";
import { SAVED_NAME_MAX_LENGTH } from "@/stores/transaction-views";

interface Props {
  onSave: (name: string) => void;
}

export function SaveTemplateControl({ onSave }: Readonly<Props>) {
  const { t } = useTranslation();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");

  function save() {
    if (!name.trim()) {
      return;
    }
    onSave(name);
    setName("");
    setNaming(false);
  }

  if (!naming) {
    return (
      <div className="col-span-full">
        <Button type="button" variant="ghost" size="sm" onClick={() => setNaming(true)}>
          <BookmarkPlus />
          {t("transactions.saveAsTemplate")}
        </Button>
      </div>
    );
  }

  return (
    <div className="col-span-full space-y-1.5">
      <Label htmlFor="tx-template-name">{t("transactions.templateName")}</Label>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          id="tx-template-name"
          value={name}
          maxLength={SAVED_NAME_MAX_LENGTH}
          placeholder={t("transactions.templateNamePlaceholder")}
          className="min-w-40 flex-1"
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              save();
            }
          }}
        />
        <Button type="button" variant="outline" disabled={!name.trim()} onClick={save}>
          {t("transactions.saveTemplate")}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setNaming(false)}>
          {t("actions.cancel")}
        </Button>
      </div>
    </div>
  );
}
