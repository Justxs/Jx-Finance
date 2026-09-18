export interface LineFormValue {
  id: string;
  categoryId: string;
  amount: string;
  description: string;
}

export function emptyLine(): LineFormValue {
  return { id: crypto.randomUUID(), categoryId: "", amount: "", description: "" };
}
