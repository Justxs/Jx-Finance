import { ArrowDown, ArrowUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button/button";
import type { MoveDirection } from "@/lib/reorder";

interface Props {
  label: string;
  first: boolean;
  last: boolean;
  disabled?: boolean;
  idPrefix?: string;
  onMove: (direction: MoveDirection) => void;
}

export function MoveButtons({
  label,
  first,
  last,
  disabled = false,
  idPrefix,
  onMove,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const buttons = [
    { direction: "up", icon: ArrowUp, labelKey: "actions.moveUp", edge: first },
    { direction: "down", icon: ArrowDown, labelKey: "actions.moveDown", edge: last },
  ] as const;

  return buttons.map(({ direction, icon: Icon, labelKey, edge }) => (
    <Button
      key={direction}
      id={idPrefix ? `${idPrefix}-${direction}` : undefined}
      variant="ghost"
      size="icon-sm"
      disabled={edge || disabled}
      onClick={() => onMove(direction)}
      aria-label={`${t(labelKey)}: ${label}`}
    >
      <Icon />
    </Button>
  ));
}
