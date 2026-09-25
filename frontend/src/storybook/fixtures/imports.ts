import type { ImportPreviewResponse, ImportPreviewRow } from "@/api/generated/model";
import { ids } from "./base";
import { statusProblem } from "./problems";

const noSuggestion = {
  suggestedCategoryId: null,
  suggestedTagIds: [] as string[],
  matchedRuleName: null,
};

export const importPreviewRows: ImportPreviewRow[] = [
  {
    importRef: "2026091700000012",
    date: "2026-09-17",
    payee: "MAXIMA LT, UAB",
    description: "Pirkinys 17.09.2026 MAXIMA X-123 VILNIUS",
    amount: "42.18",
    type: "expense",
    isDuplicate: true,
    looksLikeTransfer: false,
    currency: "eur",
    suggestedCategoryId: ids.categories.food,
    suggestedTagIds: [],
    matchedRuleName: "Parduotuvės",
  },
  {
    importRef: "2026091800000003",
    date: "2026-09-18",
    payee: "LIDL LIETUVA UAB",
    description: "Pirkinys 18.09.2026 LIDL ZIRMUNU VILNIUS",
    amount: "38.64",
    type: "expense",
    isDuplicate: false,
    looksLikeTransfer: false,
    currency: "eur",
    ...noSuggestion,
  },
  {
    importRef: "2026091800000004",
    date: "2026-09-18",
    payee: "Rūta Kazlauskienė",
    description: "Pervedimas į taupomąją sąskaitą LT647044001231465456",
    amount: "250.00",
    type: "expense",
    isDuplicate: false,
    looksLikeTransfer: true,
    currency: "eur",
    ...noSuggestion,
  },
  {
    importRef: "2026091700000031",
    date: "2026-09-17",
    payee: "TRAFI UAB",
    description: "TRAFI – mėnesinis viešojo transporto bilietas",
    amount: "29.00",
    type: "expense",
    isDuplicate: false,
    looksLikeTransfer: false,
    currency: "eur",
    suggestedCategoryId: ids.categories.transport,
    suggestedTagIds: [],
    matchedRuleName: "Viešasis transportas",
  },
  {
    importRef: "2026091600000021",
    date: "2026-09-16",
    payee: "BOLT OPERATIONS OU",
    description: "Pirkinys 16.09.2026 BOLT.EU/O/2609161842 TALLINN",
    amount: "7.40",
    type: "expense",
    isDuplicate: true,
    looksLikeTransfer: false,
    currency: "eur",
    ...noSuggestion,
  },
  {
    importRef: "2026091500000008",
    date: "2026-09-15",
    payee: "IGNITIS, UAB",
    description:
      "Mokėjimas už elektros energiją pagal sąskaitą Nr. IGN-2026-08-004417, mokėtojo kodas 10457788, laikotarpis 2026-08-01–2026-08-31",
    amount: "68.93",
    type: "expense",
    isDuplicate: false,
    looksLikeTransfer: false,
    currency: "eur",
    suggestedCategoryId: ids.categories.utilities,
    suggestedTagIds: [ids.tags.renovation],
    matchedRuleName: "Elektra",
  },
  {
    importRef: "2026091500000009",
    date: "2026-09-15",
    payee: null,
    description: null,
    amount: "12.00",
    type: "expense",
    isDuplicate: false,
    looksLikeTransfer: false,
    currency: "eur",
    ...noSuggestion,
  },
  {
    importRef: "2026091200000015",
    date: "2026-09-12",
    payee: "VALSTYBINĖ MOKESČIŲ INSPEKCIJA",
    description: "GPM permokos grąžinimas",
    amount: "134.27",
    type: "income",
    isDuplicate: false,
    looksLikeTransfer: false,
    currency: "eur",
    ...noSuggestion,
  },
  {
    importRef: "2026091000000002",
    date: "2026-09-10",
    payee: "Šarūnas Kazlauskas",
    description: "Įnašas į bendrą sąskaitą",
    amount: "900.00",
    type: "income",
    isDuplicate: false,
    looksLikeTransfer: true,
    currency: "eur",
    ...noSuggestion,
  },
];

export const importPreview: ImportPreviewResponse = { rows: importPreviewRows };

export const importPreviewAllDuplicates: ImportPreviewResponse = {
  rows: importPreviewRows.map((row) => ({ ...row, isDuplicate: true })),
};

export const importPreviewWithoutRules: ImportPreviewResponse = {
  rows: importPreviewRows.map((row) => ({ ...row, ...noSuggestion })),
};

export const importFormatProblem = {
  ...statusProblem(400),
  instance: "/api/import/swedbank/preview",
  detail: "The file doesn't match the expected Swedbank CSV export shape.",
};
