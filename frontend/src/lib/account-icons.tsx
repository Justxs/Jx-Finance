import { Banknote, Landmark, PiggyBank, Wallet } from "lucide-react";
import type { AccountType } from "@/api/generated/model";
import { cn } from "@/lib/utils";

export const accountTypeIcons: Record<AccountType, typeof Landmark> = {
  checking: Landmark,
  savings: PiggyBank,
  cash: Banknote,
  other: Wallet,
};

interface Props {
  type: AccountType;
  className?: string;
}

export function AccountTypeIcon({ type, className }: Readonly<Props>) {
  const Icon = accountTypeIcons[type];
  return <Icon className={cn("size-4", className)} />;
}
