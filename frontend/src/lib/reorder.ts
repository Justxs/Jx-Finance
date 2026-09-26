export type MoveDirection = "up" | "down";

export function adjacentIndex(index: number, direction: MoveDirection) {
  return direction === "up" ? index - 1 : index + 1;
}

export function swapItems<T>(list: readonly T[], from: number, to: number): T[] | null {
  const moving = list[from];
  const other = list[to];
  if (from < 0 || to < 0 || moving === undefined || other === undefined) {
    return null;
  }

  const next = [...list];
  next[from] = other;
  next[to] = moving;
  return next;
}

export function swapAdjacent<T>(list: readonly T[], index: number, direction: MoveDirection) {
  return swapItems(list, index, adjacentIndex(index, direction));
}
