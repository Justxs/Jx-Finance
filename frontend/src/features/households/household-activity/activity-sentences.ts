import { useTranslation } from "react-i18next";
import type { AuditChangeResponse, AuditEventResponse } from "@/api/generated/model";

const FIELDS = [
  "amount",
  "date",
  "type",
  "description",
  "category",
  "account",
  "receivedAmount",
  "fromAccount",
  "toAccount",
  "fromAmount",
  "toAmount",
  "security",
  "quantity",
  "price",
  "fee",
  "cashAmount",
  "name",
  "icon",
  "startingBalance",
  "tags",
  "split",
  "role",
] as const;

type AuditField = (typeof FIELDS)[number];

type SentenceKey =
  | AuditEventResponse["action"]
  | "bulkUpdated"
  | "archived"
  | "createdHousehold"
  | "deletedHousehold"
  | "restoredHousehold"
  | "createdAttachment"
  | "deletedAttachment"
  | "restoredAttachment";

const HOUSEHOLD_SENTENCES: Partial<Record<AuditEventResponse["action"], SentenceKey>> = {
  created: "createdHousehold",
  deleted: "deletedHousehold",
  restored: "restoredHousehold",
};

const ATTACHMENT_SENTENCES: Partial<Record<AuditEventResponse["action"], SentenceKey>> = {
  created: "createdAttachment",
  deleted: "deletedAttachment",
  restored: "restoredAttachment",
};

function isAuditField(field: string): field is AuditField {
  return (FIELDS as readonly string[]).includes(field);
}

export function sentenceKey(event: AuditEventResponse): SentenceKey {
  if (event.action === "updated" && event.entityId === null) {
    return "bulkUpdated";
  }
  const householdKey = event.entityKind === "household" ? HOUSEHOLD_SENTENCES[event.action] : null;
  if (householdKey) {
    return householdKey;
  }
  const attachmentKey =
    event.entityKind === "attachment" ? ATTACHMENT_SENTENCES[event.action] : null;
  if (attachmentKey) {
    return attachmentKey;
  }
  if (event.entityKind === "account" && event.action === "deleted") {
    return "archived";
  }
  return event.action;
}

export function useChangeText() {
  const { t } = useTranslation();

  return function changeText(change: AuditChangeResponse) {
    return t("audit.change", {
      field: isAuditField(change.field) ? t(`audit.fields.${change.field}`) : change.field,
      from: change.from ?? t("audit.none"),
      to: change.to ?? t("audit.none"),
    });
  };
}
