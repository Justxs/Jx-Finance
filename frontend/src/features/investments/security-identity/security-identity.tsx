import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { SecurityResponse } from "@/api/generated/model";
import { Tag } from "@/components/ui/tag/tag";
import { cn } from "@/lib/utils";

interface Props {
  security: Pick<SecurityResponse, "symbol" | "type">;
  meta: string;
  detail?: string | null;
  suffix?: ReactNode;
  wrap?: boolean;
}

export function SecurityIdentity({
  security,
  meta,
  detail,
  suffix,
  wrap = false,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <>
      <p className={cn("flex items-center gap-2", wrap && "flex-wrap")}>
        <span className="font-semibold">{security.symbol}</span>
        <Tag>{t(`investments.securityTypes.${security.type}`)}</Tag>
        {suffix}
      </p>
      <p className="truncate text-xs text-muted-foreground" title={meta}>
        {meta}
      </p>
      {detail ? (
        <p className="truncate text-xs text-muted-foreground" title={detail}>
          {detail}
        </p>
      ) : null}
    </>
  );
}
