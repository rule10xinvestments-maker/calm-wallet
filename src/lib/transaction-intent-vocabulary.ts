import { normalizeCategoryVocabularyPhrase } from "@/lib/category-vocabulary";

export type TransactionIntentKind = "expense" | "income" | "transfer";

export type TransactionIntentHint = {
  kind: TransactionIntentKind;
  confidence: "clear" | "ambiguous";
  matchedPhrase: string;
};

const expensePhrases = [
  "i paid",
  "paid",
  "spent",
  "bought",
  "purchased",
  "paid for",
  "bought from",
  "spent on",
  "cost me",
  "am platit",
  "platit",
  "am cumparat",
  "cumparat",
  "am dat",
  "am cheltuit",
  "cheltuit",
  "costa",
  "a costat",
  "j ai paye",
  "jai paye",
  "paye",
  "j ai achete",
  "jai achete",
  "achete",
  "depense",
  "j ai depense",
  "ca coute",
  "pague",
  "he pagado",
  "pagado",
  "compre",
  "he comprado",
  "comprado",
  "gaste",
  "he gastado",
  "me costo",
];

const incomePhrases = [
  "i received",
  "received",
  "got paid",
  "got",
  "earned",
  "income",
  "salary came in",
  "paid to me",
  "they paid me",
  "am primit",
  "primit",
  "am incasat",
  "incasat",
  "mi a intrat",
  "mi au intrat",
  "am castigat",
  "castigat",
  "salariu intrat",
  "j ai recu",
  "jai recu",
  "recu",
  "j ai gagne",
  "jai gagne",
  "gagne",
  "on m a paye",
  "on ma paye",
  "salaire recu",
  "recibi",
  "he recibido",
  "recibido",
  "cobre",
  "he cobrado",
  "gane",
  "he ganado",
  "me pagaron",
  "salario recibido",
];

const transferPhrases = [
  "transfer",
  "sent",
  "received transfer",
  "top up",
  "deposit",
  "withdraw",
  "cash out",
  "transferat",
  "trimis",
  "am trimis",
  "primit transfer",
  "depus",
  "retras",
  "scos bani",
  "virement",
  "transfere",
  "envoye",
  "depot",
  "retrait",
  "transferencia",
  "transferi",
  "enviado",
  "envie",
  "deposito",
  "retiro",
];

const removableJoiners = [
  "for",
  "to",
  "from",
  "on",
  "pentru",
  "la",
  "de la",
  "pour",
  "a",
  "chez",
  "de",
  "por",
  "para",
  "en",
];

const normalizedExpensePhrases = normalizePhrases(expensePhrases);
const normalizedIncomePhrases = normalizePhrases(incomePhrases);
const normalizedTransferPhrases = normalizePhrases(transferPhrases);
const normalizedJoiners = normalizePhrases(removableJoiners);

export function normalizeTransactionIntentText(value: string) {
  return normalizeCategoryVocabularyPhrase(value)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePhrases(phrases: string[]) {
  return phrases.map(normalizeTransactionIntentText).filter(Boolean).sort((a, b) => b.length - a.length);
}

function phrasePattern(phrase: string) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`^${escaped}(?=\\s|$)`);
}

function findPhrase(normalizedText: string, phrases: string[]) {
  return phrases.find((phrase) => phrasePattern(phrase).test(normalizedText));
}

export function findTransactionIntentHint(value: string): TransactionIntentHint | null {
  const normalized = normalizeTransactionIntentText(value);

  if (!normalized) {
    return null;
  }

  const incomePhrase = findPhrase(normalized, normalizedIncomePhrases);
  const expensePhrase = findPhrase(normalized, normalizedExpensePhrases);
  const transferPhrase = findPhrase(normalized, normalizedTransferPhrases);

  if (incomePhrase && !expensePhrase) {
    return { kind: "income", confidence: "clear", matchedPhrase: incomePhrase };
  }

  if (expensePhrase && !incomePhrase) {
    return { kind: "expense", confidence: "clear", matchedPhrase: expensePhrase };
  }

  if (incomePhrase && expensePhrase && incomePhrase.length !== expensePhrase.length) {
    return incomePhrase.length > expensePhrase.length
      ? { kind: "income", confidence: "clear", matchedPhrase: incomePhrase }
      : { kind: "expense", confidence: "clear", matchedPhrase: expensePhrase };
  }

  if (transferPhrase) {
    return { kind: "transfer", confidence: "ambiguous", matchedPhrase: transferPhrase };
  }

  return null;
}

function stripLeadingPhrase(normalizedText: string, phrase: string) {
  return normalizedText.replace(new RegExp(`^${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\s|$)`), "").trim();
}

export function cleanTransactionIntentTitle(value: string, hint: TransactionIntentHint | null) {
  const normalized = normalizeTransactionIntentText(value);

  if (!normalized || !hint) {
    return normalized || undefined;
  }

  const originalTokens: string[] = value.match(/[\p{L}\p{N}]+/gu) ?? [];
  let cleanedTokens = originalTokens;
  const phraseWordCount = hint.matchedPhrase.split(" ").length;

  if (stripLeadingPhrase(normalized, hint.matchedPhrase) !== normalized) {
    cleanedTokens = cleanedTokens.slice(phraseWordCount);
  }

  for (const joiner of normalizedJoiners) {
    const joinerWordCount = joiner.split(" ").length;
    const leading = normalizeTransactionIntentText(cleanedTokens.slice(0, joinerWordCount).join(" "));

    if (leading === joiner) {
      cleanedTokens = cleanedTokens.slice(joinerWordCount);
      break;
    }
  }

  const originalCleaned = cleanedTokens.join(" ").trim();
  const withoutIntent = normalizeTransactionIntentText(originalCleaned);

  if (!withoutIntent || /^\d+(?:\s+\d+)*$/.test(withoutIntent)) {
    return undefined;
  }

  return originalCleaned || withoutIntent;
}

export function containsTransactionIntentPhrase(value: string) {
  return Boolean(findTransactionIntentHint(value));
}
