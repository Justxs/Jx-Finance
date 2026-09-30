import type { PayeeNameResponse } from "@/api/generated/model";
import { ids } from "./base";

export const payeeNames: PayeeNameResponse[] = [
  { id: ids.payeeNames.maxima, payeeKey: "maxima x ukmergės g", name: "Maxima" },
  { id: ids.payeeNames.telia, payeeKey: "telia mobilusis ryšys ir internetas", name: "Telia" },
];
