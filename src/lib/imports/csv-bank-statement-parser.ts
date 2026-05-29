import type { ParserResultCandidateInput } from "@/domain/imports/types";

export const CSV_IMPORT_MAX_ROWS = 200;
export const CSV_IMPORT_MAX_COLUMNS = 24;
export const CSV_IMPORT_MAX_CELL_LENGTH = 240;

export type CsvBankStatementParseResult = {
  candidates: ParserResultCandidateInput[];
  skippedRowCount: number;
  skippedRowReasons: string[];
};

type ColumnMap = {
  amountIndex: number | null;
  debitIndex: number | null;
  creditIndex: number | null;
  directionIndex: number | null;
  dateIndex: number | null;
  descriptionIndex: number | null;
};

const amountHeaders = new Set(["amount", "transactionamount", "value", "sum", "total"]);
const debitHeaders = new Set(["debit", "withdrawal", "withdrawals", "charge", "charges", "paidout", "outflow"]);
const creditHeaders = new Set(["credit", "deposit", "deposits", "paidin", "inflow"]);
const directionHeaders = new Set(["type", "direction", "transactiontype", "debitcredit", "drcr"]);
const dateHeaders = new Set(["date", "posteddate", "transactiondate", "occurredat", "bookeddate"]);
const descriptionHeaders = new Set([
  "description",
  "counterparty",
  "merchant",
  "payee",
  "memo",
  "narrative",
  "details",
  "name",
]);

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function assertSafeShape(rows: string[][]) {
  if (rows.length > CSV_IMPORT_MAX_ROWS + 1) {
    throw new Error(`CSV import can include at most ${CSV_IMPORT_MAX_ROWS} data rows.`);
  }

  for (const row of rows) {
    if (row.length > CSV_IMPORT_MAX_COLUMNS) {
      throw new Error(`CSV import can include at most ${CSV_IMPORT_MAX_COLUMNS} columns.`);
    }

    for (const cell of row) {
      if (cell.length > CSV_IMPORT_MAX_CELL_LENGTH) {
        throw new Error(`CSV cells can include at most ${CSV_IMPORT_MAX_CELL_LENGTH} characters.`);
      }
    }
  }
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  rows.push(row);

  return rows.filter((candidateRow) => candidateRow.some((candidateCell) => candidateCell.trim().length > 0));
}

function detectColumns(header: string[]): ColumnMap {
  const normalized = header.map(normalizeHeader);
  const findIndex = (headers: Set<string>) => {
    const index = normalized.findIndex((value) => headers.has(value));
    return index === -1 ? null : index;
  };

  return {
    amountIndex: findIndex(amountHeaders),
    debitIndex: findIndex(debitHeaders),
    creditIndex: findIndex(creditHeaders),
    directionIndex: findIndex(directionHeaders),
    dateIndex: findIndex(dateHeaders),
    descriptionIndex: findIndex(descriptionHeaders),
  };
}

function hasMinimumColumns(columnMap: ColumnMap) {
  return (
    columnMap.dateIndex !== null &&
    columnMap.descriptionIndex !== null &&
    (columnMap.amountIndex !== null || columnMap.debitIndex !== null || columnMap.creditIndex !== null)
  );
}

function parseAmount(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const negativeByParens = /^\(.*\)$/.test(trimmed);
  const cleaned = trimmed.replace(/[,$\s()]/g, "");
  const parsed = Number(cleaned);

  if (!Number.isFinite(parsed) || parsed === 0) {
    return null;
  }

  return negativeByParens ? -Math.abs(parsed) : parsed;
}

function resolveAmount(row: string[], columnMap: ColumnMap) {
  const debitAmount = columnMap.debitIndex === null ? null : parseAmount(row[columnMap.debitIndex] ?? "");
  const creditAmount = columnMap.creditIndex === null ? null : parseAmount(row[columnMap.creditIndex] ?? "");

  if (debitAmount !== null) {
    return { amount: Math.abs(debitAmount), transactionType: "expense" as const };
  }

  if (creditAmount !== null) {
    return { amount: Math.abs(creditAmount), transactionType: "income" as const };
  }

  if (columnMap.amountIndex === null) {
    return null;
  }

  const amount = parseAmount(row[columnMap.amountIndex] ?? "");

  if (amount === null) {
    return null;
  }

  const direction = columnMap.directionIndex === null ? "" : normalizeHeader(row[columnMap.directionIndex] ?? "");

  if (["debit", "withdrawal", "expense", "charge", "dr"].includes(direction)) {
    return { amount: Math.abs(amount), transactionType: "expense" as const };
  }

  if (["credit", "deposit", "income", "cr"].includes(direction)) {
    return { amount: Math.abs(amount), transactionType: "income" as const };
  }

  return {
    amount: Math.abs(amount),
    transactionType: amount < 0 ? ("expense" as const) : ("income" as const),
  };
}

function parseDate(value: string) {
  const trimmed = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T00:00:00.000Z`;
  }

  const slashDate = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);

  if (slashDate) {
    const month = slashDate[1].padStart(2, "0");
    const day = slashDate[2].padStart(2, "0");
    return `${slashDate[3]}-${month}-${day}T00:00:00.000Z`;
  }

  const parsed = new Date(trimmed);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function toAmountMinor(amount: number) {
  return Math.round(amount * 100);
}

export function parseCsvBankStatement(text: string): CsvBankStatementParseResult {
  const rows = parseCsv(text);

  assertSafeShape(rows);

  if (rows.length < 2) {
    return {
      candidates: [],
      skippedRowCount: 0,
      skippedRowReasons: ["CSV import needs a header row and at least one data row."],
    };
  }

  const [header, ...dataRows] = rows;
  const columnMap = detectColumns(header);

  if (!hasMinimumColumns(columnMap)) {
    throw new Error("CSV import needs date, amount, and description columns.");
  }

  const candidates: ParserResultCandidateInput[] = [];
  const skippedRowReasons: string[] = [];

  for (const row of dataRows) {
    const amount = resolveAmount(row, columnMap);
    const occurredAt = columnMap.dateIndex === null ? null : parseDate(row[columnMap.dateIndex] ?? "");
    const description =
      columnMap.descriptionIndex === null ? "" : normalizeText(row[columnMap.descriptionIndex] ?? "");

    if (!amount || !occurredAt || !description) {
      skippedRowReasons.push("A CSV row was skipped because amount, date, or description was missing or invalid.");
      continue;
    }

    candidates.push({
      transactionType: amount.transactionType,
      amountMinor: toAmountMinor(amount.amount),
      currency: "USD",
      occurredAt,
      description,
      merchantGuess: description.slice(0, 120),
      confidenceScore: null,
    });
  }

  return {
    candidates,
    skippedRowCount: skippedRowReasons.length,
    skippedRowReasons,
  };
}
