import type {
  CsvMappingResponse,
  ImportInboxFileResponse,
  ImportInboxStatusResponse,
  ImportPreviewResponse,
  ImportPreviewRow,
  ImportStatementSummary,
  InspectCsvResponse,
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

export const revolutCsv = `Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance
CARD_PAYMENT,Current,2026-09-01 10:15:02,2026-09-02 08:01:44,Lidl,-15.77,0.00,EUR,COMPLETED,984.23
CARD_PAYMENT,Current,2026-09-03 12:00:00,2026-09-03 12:00:05,Coffee,-3.50,0.00,EUR,COMPLETED,980.73
TOPUP,Current,2026-09-04 09:00:00,2026-09-04 09:00:01,Top-up by *1234,500.00,0.00,EUR,COMPLETED,1480.73
ATM,Current,2026-09-05 18:30:00,2026-09-05 18:30:02,Cash at Vilnius,-10.00,0.50,EUR,COMPLETED,1470.23
CARD_PAYMENT,Current,2026-09-06 20:00:00,,Pending shop,-7.00,0.00,EUR,PENDING,
`;

export const revolutMapping: CsvMappingResponse = {
  id: uid("c5c5c5c5", 1),
  name: "Revolut",
  encoding: "utf8",
  delimiter: ",",
  skipLines: 0,
  amountStyle: "signedNegativeIsExpense",
  dateFormat: "yyyy-MM-dd",
  decimalSeparator: "dot",
  currency: null,
  columns: {
    date: "Completed Date",
    description: "Description",
    payee: null,
    amount: "Amount",
    debit: null,
    credit: null,
    direction: null,
    expenseValue: null,
    currency: "Currency",
    reference: null,
    balance: "Balance",
    fee: "Fee",
    status: "State",
    bookedValues: "COMPLETED",
  },
};

export const csvMappings: CsvMappingResponse[] = [revolutMapping];

export const inboxFiles: ImportInboxFileResponse[] = [
  {
    id: uid("4c4c4c4c", 1),
    fileName: "swedbank-2026-09.xml",
    format: "camt053",
    accountId: ids.accounts.checking,
    mappingId: null,
    receivedAt: "2026-09-18T06:05:00Z",
  },
  {
    id: uid("4c4c4c4c", 2),
    fileName: "revolut-statement-september.csv",
    format: "genericCsv",
    accountId: ids.accounts.savings,
    mappingId: revolutMapping.id,
    receivedAt: "2026-09-17T21:40:00Z",
  },
];

export const importInboxStatus: ImportInboxStatusResponse = {
  directory: "/import-inbox",
  failures: [
    {
      fileName: "LT601010012345678901/card-2026-09.csv",
      reason:
        "None of the account owner's saved CSV mappings reads this file. Save a mapping by importing one file by hand.",
      at: "2026-09-18T06:10:00Z",
    },
    {
      fileName: "statement-joint.xml",
      reason: "No account has the IBAN LT447300010123456789. Record it on the account first.",
      at: "2026-09-16T05:00:00Z",
    },
  ],
};

export const importInboxQuiet: ImportInboxStatusResponse = {
  directory: "/import-inbox",
  failures: [],
};

export const importInboxOff: ImportInboxStatusResponse = { directory: null, failures: [] };

export const revolutInspection: InspectCsvResponse = {
  encoding: "utf8",
  delimiter: ",",
  skipLines: 0,
  columns: [
    { name: "Type", dateFormats: [], decimalSeparator: null },
    { name: "Product", dateFormats: [], decimalSeparator: null },
    { name: "Started Date", dateFormats: ["yyyy-MM-dd"], decimalSeparator: null },
    { name: "Completed Date", dateFormats: ["yyyy-MM-dd"], decimalSeparator: null },
    { name: "Description", dateFormats: [], decimalSeparator: null },
    { name: "Amount", dateFormats: [], decimalSeparator: "dot" },
    { name: "Fee", dateFormats: [], decimalSeparator: "dot" },
    { name: "Currency", dateFormats: [], decimalSeparator: null },
    { name: "State", dateFormats: [], decimalSeparator: null },
    { name: "Balance", dateFormats: [], decimalSeparator: "dot" },
  ],
  samples: revolutCsv
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => line.split(",")),
  matchingMappingIds: [],
};

export const revolutInspectionFitting: InspectCsvResponse = {
  ...revolutInspection,
  matchingMappingIds: [revolutMapping.id],
};

export const cardInspection: InspectCsvResponse = {
  encoding: "windows1257",
  delimiter: ";",
  skipLines: 3,
  columns: [
    { name: "Data", dateFormats: ["dd/MM/yyyy", "MM/dd/yyyy"], decimalSeparator: null },
    { name: "Prekybininkas", dateFormats: [], decimalSeparator: null },
    { name: "Suma", dateFormats: [], decimalSeparator: "comma" },
    { name: "Likutis", dateFormats: [], decimalSeparator: "comma" },
  ],
  samples: [
    ["03/09/2026", "Mokėjimas – ačiū", "-150,00", "50,00"],
    ["05/09/2026", "Grąžinimas Zara", "-19,99", "200,00"],
    ["07/09/2026", "Zara", "49,99", "219,99"],
    ["09/09/2026", "Maxima", "170,00", "170,00"],
  ],
  matchingMappingIds: [],
};

export const mappedCsvPreview: ImportPreviewResponse = {
  rows: camtPreviewRows.slice(0, 3),
  statement: {
    ...camtStatement,
    iban: null,
    ibanMatchesAccount: false,
    notBooked: 1,
    unreadable: 2,
  },
};
