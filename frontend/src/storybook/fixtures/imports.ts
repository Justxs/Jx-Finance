import type {
  ImportPreviewResponse,
  ImportPreviewRow,
  ImportStatementSummary,
} from "@/api/generated/model";
import { ids, uid } from "./base";
import { statusProblem } from "./problems";

const noSuggestion = {
  suggestedCategoryId: null,
  suggestedTagIds: [] as string[],
  matchedRuleName: null,
};

const swedbankRows = [
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
    amount: "138.64",
    type: "expense",
    isDuplicate: false,
    looksLikeTransfer: false,
    currency: "eur",
    ...noSuggestion,
    unusual: { basis: "payee", typicalAmount: "36.20", factor: 3.8, sampleSize: 9 },
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
] satisfies Omit<ImportPreviewRow, "isReversal" | "suggestedTransferAccountId">[];

export const importPreviewRows: ImportPreviewRow[] = swedbankRows.map((row) => ({
  isReversal: false,
  suggestedTransferAccountId: null,
  ...row,
}));

const csvStatement: ImportStatementSummary = {
  iban: null,
  ibanMatchesAccount: false,
  otherAccountId: null,
  notBooked: 0,
  unreadable: 0,
  closingDate: null,
  closingBalance: null,
  closingCurrency: null,
  ledgerBalanceAtClose: null,
};

export const importPreview: ImportPreviewResponse = {
  rows: importPreviewRows,
  statement: csvStatement,
};

export const importPreviewAllDuplicates: ImportPreviewResponse = {
  rows: importPreviewRows.map((row) => ({ ...row, isDuplicate: true })),
  statement: csvStatement,
};

const camtRow = {
  ...noSuggestion,
  isDuplicate: false,
  looksLikeTransfer: false,
  isReversal: false,
  suggestedTransferAccountId: null,
  currency: "eur",
} as const;

export const camtPreviewRows: ImportPreviewRow[] = [
  {
    ...camtRow,
    importRef: "2026092800000101/0",
    date: "2026-09-28",
    payee: "MAXIMA LT, UAB",
    description: "Kortelės operacija MAXIMA X-123 VILNIUS",
    amount: "23.40",
    type: "expense",
  },
  {
    ...camtRow,
    importRef: "2026092800000101/1",
    date: "2026-09-28",
    payee: "CIRCLE K LIETUVA",
    description: "Kortelės operacija CIRCLE K ZIRMUNU",
    amount: "41.10",
    type: "expense",
  },
  {
    ...camtRow,
    importRef: "2026092700000044",
    date: "2026-09-27",
    payee: "BOLT OPERATIONS OU",
    description: "Grąžinimas BOLT.EU/O/2609161842",
    amount: "7.40",
    type: "income",
    isReversal: true,
    refundCandidate: {
      id: uid("55555555", 2),
      date: "2026-09-16",
      description: "Bolt pavėžėjimas",
      categoryId: ids.categories.transport,
    },
  },
  {
    ...camtRow,
    importRef: "2026092500000017",
    date: "2026-09-25",
    payee: "Rūta Kazlauskienė",
    description: "Į taupomąją sąskaitą",
    amount: "300.00",
    type: "expense",
    looksLikeTransfer: true,
    suggestedTransferAccountId: ids.accounts.savings,
  },
  {
    ...camtRow,
    importRef: "2026092400000003",
    date: "2026-09-24",
    payee: "UAB DARBDAVYS",
    description: "Darbo užmokestis už rugsėjį",
    amount: "2150.00",
    type: "income",
  },
  {
    ...camtRow,
    importRef: "2026092200000009",
    date: "2026-09-22",
    payee: "SPOTIFY AB",
    description: "Spotify Premium",
    amount: "12.99",
    type: "expense",
    isDuplicate: true,
  },
];

export const camtStatement: ImportStatementSummary = {
  iban: "LT127300010123456789",
  ibanMatchesAccount: true,
  otherAccountId: null,
  notBooked: 2,
  unreadable: 0,
  closingDate: "2026-09-30",
  closingBalance: "3273.25",
  closingCurrency: "eur",
  ledgerBalanceAtClose: "1480.35",
};

export const camtPreview: ImportPreviewResponse = {
  rows: camtPreviewRows,
  statement: camtStatement,
};

export const camtPreviewOtherAccount: ImportPreviewResponse = {
  rows: camtPreviewRows,
  statement: {
    ...camtStatement,
    iban: "LT647044001231465456",
    ibanMatchesAccount: false,
    otherAccountId: ids.accounts.savings,
  },
};

export const camtStatementXml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.02">
  <BkToCstmrStmt>
    <Stmt>
      <Acct><Id><IBAN>LT127300010123456789</IBAN></Id><Ccy>EUR</Ccy></Acct>
      <Ntry>
        <AcctSvcrRef>2026092400000003</AcctSvcrRef>
        <Amt Ccy="EUR">2150.00</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <Sts>BOOK</Sts>
        <BookgDt><Dt>2026-09-24</Dt></BookgDt>
      </Ntry>
    </Stmt>
  </BkToCstmrStmt>
</Document>
`;

export const importFormatProblem = {
  ...statusProblem(400),
  instance: "/api/import/preview",
  detail: "The file doesn't match the expected Swedbank CSV export shape.",
};
