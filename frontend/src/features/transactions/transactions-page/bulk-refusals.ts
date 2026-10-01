import type { TransactionRefusalResponse } from "@/api/generated/model";
import { errorCodeText } from "@/lib/form-server-errors";

export function refusalReasons(refused: readonly TransactionRefusalResponse[]): string {
  const reasons = refused.map((item) => errorCodeText(item.code, item.reason) ?? item.reason);
  return [...new Set(reasons)].join(" ");
}
