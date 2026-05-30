import { describe, expect, it } from "vitest";
import { parseNaturalLanguageAssistantInput } from "@/domain/assistant/natural-language-parser";

describe("natural-language assistant parser", () => {
  it("parses simple merchant amount shorthand as an expense needing category review", () => {
    expect(parseNaturalLanguageAssistantInput("coffee 5")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "5",
      merchant: "coffee",
      reviewState: "needs_attention",
      uncertaintyReason: "Category needs review.",
    });
  });

  it("uses leading amount signs as transaction direction metadata", () => {
    expect(parseNaturalLanguageAssistantInput("+350")).toEqual({
      kind: "create_transaction",
      transactionType: "income",
      amount: "350",
      merchant: "Income",
    });

    expect(parseNaturalLanguageAssistantInput("+ 350")).toEqual({
      kind: "create_transaction",
      transactionType: "income",
      amount: "350",
      merchant: "Income",
    });

    expect(parseNaturalLanguageAssistantInput("+350 salary")).toEqual({
      kind: "create_transaction",
      transactionType: "income",
      amount: "350",
      merchant: "salary",
    });

    expect(parseNaturalLanguageAssistantInput("salary +350")).toEqual({
      kind: "create_transaction",
      transactionType: "income",
      amount: "350",
      merchant: "salary",
    });

    expect(parseNaturalLanguageAssistantInput("-350")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "350",
      merchant: "Expense",
    });

    expect(parseNaturalLanguageAssistantInput("- 350")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "350",
      merchant: "Expense",
    });

    expect(parseNaturalLanguageAssistantInput("-20 coffee")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "20",
      merchant: "coffee",
      reviewState: "needs_attention",
      uncertaintyReason: "Category needs review.",
    });

    expect(parseNaturalLanguageAssistantInput("coffee -20")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "20",
      merchant: "coffee",
      reviewState: "needs_attention",
      uncertaintyReason: "Category needs review.",
    });
  });

  it("uses signs on attached currency amount tokens as direction metadata", () => {
    expect(parseNaturalLanguageAssistantInput("+60eur sub")).toEqual({
      kind: "create_transaction",
      transactionType: "income",
      amount: "60",
      currency: "EUR",
      merchant: "sub",
    });

    expect(parseNaturalLanguageAssistantInput("+60 eur sub")).toEqual({
      kind: "create_transaction",
      transactionType: "income",
      amount: "60",
      currency: "EUR",
      merchant: "sub",
    });

    expect(parseNaturalLanguageAssistantInput("sub +60eur")).toEqual({
      kind: "create_transaction",
      transactionType: "income",
      amount: "60",
      currency: "EUR",
      merchant: "sub",
    });

    expect(parseNaturalLanguageAssistantInput("-60eur sub")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "60",
      currency: "EUR",
      merchant: "sub",
      reviewState: "needs_attention",
      uncertaintyReason: "Category needs review.",
    });

    expect(parseNaturalLanguageAssistantInput("sub -60eur")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "60",
      currency: "EUR",
      merchant: "sub",
      reviewState: "needs_attention",
      uncertaintyReason: "Category needs review.",
    });

    expect(parseNaturalLanguageAssistantInput("+60lei salariu")).toEqual({
      kind: "create_transaction",
      transactionType: "income",
      amount: "60",
      currency: "RON",
      merchant: "salariu",
    });

    expect(parseNaturalLanguageAssistantInput("-30eur chatgpt")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "30",
      currency: "EUR",
      merchant: "chatgpt",
      reviewState: "needs_attention",
      uncertaintyReason: "Category needs review.",
    });

    expect(parseNaturalLanguageAssistantInput("-30 eur chatgpt")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "30",
      currency: "EUR",
      merchant: "chatgpt",
      reviewState: "needs_attention",
      uncertaintyReason: "Category needs review.",
    });

    expect(parseNaturalLanguageAssistantInput("chatgpt -30eur")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "30",
      currency: "EUR",
      merchant: "chatgpt",
      reviewState: "needs_attention",
      uncertaintyReason: "Category needs review.",
    });

    expect(parseNaturalLanguageAssistantInput("chatgpt -30 eur")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "30",
      currency: "EUR",
      merchant: "chatgpt",
      reviewState: "needs_attention",
      uncertaintyReason: "Category needs review.",
    });

    expect(parseNaturalLanguageAssistantInput("+30eur refund")).toEqual({
      kind: "create_transaction",
      transactionType: "income",
      amount: "30",
      currency: "EUR",
      merchant: "refund",
    });

    expect(parseNaturalLanguageAssistantInput("salary +1200eur")).toEqual({
      kind: "create_transaction",
      transactionType: "income",
      amount: "1200",
      currency: "EUR",
      merchant: "salary",
    });
  });

  it("consumes currency tokens without keeping them in the merchant label", () => {
    expect(parseNaturalLanguageAssistantInput("34 usd hotdog")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "34",
      currency: "USD",
      merchant: "hotdog",
      reviewState: "needs_attention",
      uncertaintyReason: "Category needs review.",
    });

    expect(parseNaturalLanguageAssistantInput("30 eur carburant")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "30",
      currency: "EUR",
      merchant: "carburant",
      reviewState: "needs_attention",
      uncertaintyReason: "Category needs review.",
    });

    expect(parseNaturalLanguageAssistantInput("hotdog 34 usd")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "34",
      currency: "USD",
      merchant: "hotdog",
      reviewState: "needs_attention",
      uncertaintyReason: "Category needs review.",
    });

    expect(parseNaturalLanguageAssistantInput("30eur chatgpt")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "30",
      currency: "EUR",
      merchant: "chatgpt",
      reviewState: "needs_attention",
      uncertaintyReason: "Category needs review.",
    });

    expect(parseNaturalLanguageAssistantInput("30 eur chatgpt")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "30",
      currency: "EUR",
      merchant: "chatgpt",
      reviewState: "needs_attention",
      uncertaintyReason: "Category needs review.",
    });

    expect(parseNaturalLanguageAssistantInput("30usd coffee")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "30",
      currency: "USD",
      merchant: "coffee",
      reviewState: "needs_attention",
      uncertaintyReason: "Category needs review.",
    });

    expect(parseNaturalLanguageAssistantInput("-30usd coffee")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "30",
      currency: "USD",
      merchant: "coffee",
      reviewState: "needs_attention",
      uncertaintyReason: "Category needs review.",
    });

    expect(parseNaturalLanguageAssistantInput("-30€ chatgpt")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "30",
      currency: "EUR",
      merchant: "chatgpt",
      reviewState: "needs_attention",
      uncertaintyReason: "Category needs review.",
    });
  });

  it("splits multiple amount/currency groups into separate create intents", () => {
    expect(parseNaturalLanguageAssistantInput("20eur sub 30ron kaufland")).toEqual({
      kind: "create_transactions",
      entries: [
        {
          kind: "create_transaction",
          transactionType: "expense",
          amount: "20",
          currency: "EUR",
          merchant: "sub",
          reviewState: "needs_attention",
          uncertaintyReason: "Category needs review.",
        },
        {
          kind: "create_transaction",
          transactionType: "expense",
          amount: "30",
          currency: "RON",
          merchant: "kaufland",
          reviewState: "needs_attention",
          uncertaintyReason: "Category needs review.",
        },
      ],
    });

    expect(parseNaturalLanguageAssistantInput("sub 20eur kaufland 30ron")).toEqual({
      kind: "create_transactions",
      entries: [
        {
          kind: "create_transaction",
          transactionType: "expense",
          amount: "20",
          currency: "EUR",
          merchant: "sub",
          reviewState: "needs_attention",
          uncertaintyReason: "Category needs review.",
        },
        {
          kind: "create_transaction",
          transactionType: "expense",
          amount: "30",
          currency: "RON",
          merchant: "kaufland",
          reviewState: "needs_attention",
          uncertaintyReason: "Category needs review.",
        },
      ],
    });

    expect(parseNaturalLanguageAssistantInput("20 eur sub, 30 ron kaufland")).toEqual({
      kind: "create_transactions",
      entries: [
        {
          kind: "create_transaction",
          transactionType: "expense",
          amount: "20",
          currency: "EUR",
          merchant: "sub",
          reviewState: "needs_attention",
          uncertaintyReason: "Category needs review.",
        },
        {
          kind: "create_transaction",
          transactionType: "expense",
          amount: "30",
          currency: "RON",
          merchant: "kaufland",
          reviewState: "needs_attention",
          uncertaintyReason: "Category needs review.",
        },
      ],
    });

    expect(parseNaturalLanguageAssistantInput("+1200ron salary -20ron lunch")).toEqual({
      kind: "create_transactions",
      entries: [
        {
          kind: "create_transaction",
          transactionType: "income",
          amount: "1200",
          currency: "RON",
          merchant: "salary",
        },
        {
          kind: "create_transaction",
          transactionType: "expense",
          amount: "20",
          currency: "RON",
          merchant: "lunch",
          reviewState: "needs_attention",
          uncertaintyReason: "Category needs review.",
        },
      ],
    });
  });

  it("consumes full-word currency aliases before building the merchant label", () => {
    expect(parseNaturalLanguageAssistantInput("o paine 2 euro")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "2",
      currency: "EUR",
      merchant: "paine",
      reviewState: "needs_attention",
      uncertaintyReason: "Category needs review.",
    });

    expect(parseNaturalLanguageAssistantInput("paine 2 euro")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "2",
      currency: "EUR",
      merchant: "paine",
      reviewState: "needs_attention",
      uncertaintyReason: "Category needs review.",
    });

    expect(parseNaturalLanguageAssistantInput("2 euro paine")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "2",
      currency: "EUR",
      merchant: "paine",
      reviewState: "needs_attention",
      uncertaintyReason: "Category needs review.",
    });

    expect(parseNaturalLanguageAssistantInput("o pâine 2 euros")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "2",
      currency: "EUR",
      merchant: "pâine",
      reviewState: "needs_attention",
      uncertaintyReason: "Category needs review.",
    });

    expect(parseNaturalLanguageAssistantInput("un taxi 20 lei")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "20",
      currency: "RON",
      merchant: "taxi",
      reviewState: "needs_attention",
      uncertaintyReason: "Category needs review.",
    });

    expect(parseNaturalLanguageAssistantInput("hotdog 3 dollars")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "3",
      currency: "USD",
      merchant: "hotdog",
      reviewState: "needs_attention",
      uncertaintyReason: "Category needs review.",
    });

    expect(parseNaturalLanguageAssistantInput("a coffee 5 usd")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "5",
      currency: "USD",
      merchant: "coffee",
      reviewState: "needs_attention",
      uncertaintyReason: "Category needs review.",
    });
  });

  it("treats Romanian lei tokens as RON currency metadata", () => {
    expect(parseNaturalLanguageAssistantInput("niste cartofi 10 lei")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "10",
      currency: "RON",
      merchant: "cartofi",
      reviewState: "needs_attention",
      uncertaintyReason: "Category needs review.",
    });

    expect(parseNaturalLanguageAssistantInput("10 lei cartofi")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "10",
      currency: "RON",
      merchant: "cartofi",
      reviewState: "needs_attention",
      uncertaintyReason: "Category needs review.",
    });

    expect(parseNaturalLanguageAssistantInput("60 lei cola")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "60",
      currency: "RON",
      merchant: "cola",
      reviewState: "needs_attention",
      uncertaintyReason: "Category needs review.",
    });

    expect(parseNaturalLanguageAssistantInput("15 lei bidoane apa")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "15",
      currency: "RON",
      merchant: "bidoane apa",
      reviewState: "needs_attention",
      uncertaintyReason: "Category needs review.",
    });

    expect(parseNaturalLanguageAssistantInput("15 lei bere")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "15",
      currency: "RON",
      merchant: "bere",
      reviewState: "needs_attention",
      uncertaintyReason: "Category needs review.",
    });

    expect(parseNaturalLanguageAssistantInput("35 lei meniul zilei")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "35",
      currency: "RON",
      merchant: "meniul zilei",
      reviewState: "needs_attention",
      uncertaintyReason: "Category needs review.",
    });

    expect(parseNaturalLanguageAssistantInput("meniul zilei 35 lei")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "35",
      currency: "RON",
      merchant: "meniul zilei",
      reviewState: "needs_attention",
      uncertaintyReason: "Category needs review.",
    });

    expect(parseNaturalLanguageAssistantInput("bidoane apa 15 lei")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "15",
      currency: "RON",
      merchant: "bidoane apa",
      reviewState: "needs_attention",
      uncertaintyReason: "Category needs review.",
    });

    expect(parseNaturalLanguageAssistantInput("15 ron bere")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "15",
      currency: "RON",
      merchant: "bere",
      reviewState: "needs_attention",
      uncertaintyReason: "Category needs review.",
    });

    expect(parseNaturalLanguageAssistantInput("30ron rosii")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "30",
      currency: "RON",
      merchant: "rosii",
      reviewState: "needs_attention",
      uncertaintyReason: "Category needs review.",
    });

    expect(parseNaturalLanguageAssistantInput("-30ron rosii")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "30",
      currency: "RON",
      merchant: "rosii",
      reviewState: "needs_attention",
      uncertaintyReason: "Category needs review.",
    });

    expect(parseNaturalLanguageAssistantInput("30 lei rosii")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "30",
      currency: "RON",
      merchant: "rosii",
      reviewState: "needs_attention",
      uncertaintyReason: "Category needs review.",
    });

    expect(parseNaturalLanguageAssistantInput("-30 lei rosii")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "30",
      currency: "RON",
      merchant: "rosii",
      reviewState: "needs_attention",
      uncertaintyReason: "Category needs review.",
    });

    expect(parseNaturalLanguageAssistantInput("10 lei benzină")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "10",
      currency: "RON",
      merchant: "benzină",
      reviewState: "needs_attention",
      uncertaintyReason: "Category needs review.",
    });

    expect(parseNaturalLanguageAssistantInput("bere 15 ron")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "15",
      currency: "RON",
      merchant: "bere",
      reviewState: "needs_attention",
      uncertaintyReason: "Category needs review.",
    });

    expect(parseNaturalLanguageAssistantInput("15 leu bere")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "15",
      currency: "RON",
      merchant: "bere",
      reviewState: "needs_attention",
      uncertaintyReason: "Category needs review.",
    });
  });

  it("keeps shorthand labels clean when no currency token is present", () => {
    expect(parseNaturalLanguageAssistantInput("cartofi 10")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "10",
      merchant: "cartofi",
      reviewState: "needs_attention",
      uncertaintyReason: "Category needs review.",
    });
  });

  it("parses spent and paid expense phrasing", () => {
    expect(parseNaturalLanguageAssistantInput("spent 32 on groceries")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "32",
      merchant: "groceries",
      reviewState: "needs_attention",
      uncertaintyReason: "Category needs review.",
    });

    expect(parseNaturalLanguageAssistantInput("paid 12.50 for lunch")).toEqual({
      kind: "create_transaction",
      transactionType: "expense",
      amount: "12.50",
      merchant: "lunch",
      reviewState: "needs_attention",
      uncertaintyReason: "Category needs review.",
    });
  });

  it("parses income phrasing without forcing category review", () => {
    expect(parseNaturalLanguageAssistantInput("salary 2500")).toEqual({
      kind: "create_transaction",
      transactionType: "income",
      amount: "2500",
      merchant: "Salary",
    });

    expect(parseNaturalLanguageAssistantInput("got paid 3000")).toEqual({
      kind: "create_transaction",
      transactionType: "income",
      amount: "3000",
      merchant: "Paycheck",
    });

    expect(parseNaturalLanguageAssistantInput("freelance income 1200")).toEqual({
      kind: "create_transaction",
      transactionType: "income",
      amount: "1200",
      merchant: "Freelance income",
    });
  });

  it("routes recent, delete last, and simple spending requests", () => {
    expect(parseNaturalLanguageAssistantInput("show recent")).toEqual({
      kind: "answer_financial_question",
      questionKind: "recent_transactions_summary",
    });
    expect(parseNaturalLanguageAssistantInput("show needs review")).toEqual({
      kind: "answer_financial_question",
      questionKind: "needs_review_summary",
    });
    expect(parseNaturalLanguageAssistantInput("show things needing review")).toEqual({
      kind: "answer_financial_question",
      questionKind: "needs_review_summary",
    });
    expect(parseNaturalLanguageAssistantInput("delete last")).toEqual({
      kind: "delete_transaction",
      target: {
        kind: "last",
      },
    });
    expect(parseNaturalLanguageAssistantInput("how much did I spend?")).toEqual({
      kind: "answer_financial_question",
      questionKind: "monthly_spending_total",
    });
  });

  it("parses narrow read-only financial questions", () => {
    expect(parseNaturalLanguageAssistantInput("how much income this month")).toMatchObject({
      kind: "answer_financial_question",
      questionKind: "monthly_income_total",
    });
    expect(parseNaturalLanguageAssistantInput("how much did I spend on groceries")).toEqual({
      kind: "answer_financial_question",
      questionKind: "category_spending_total",
      categoryPhrase: "groceries",
    });
    expect(parseNaturalLanguageAssistantInput("largest expense")).toMatchObject({
      kind: "answer_financial_question",
      questionKind: "recent_largest_expense",
    });
    expect(parseNaturalLanguageAssistantInput("what is my balance")).toEqual({
      kind: "unsupported",
      message: "I can summarize tracked transactions, but Tracked balance questions are not available yet.",
    });
    expect(parseNaturalLanguageAssistantInput("what is my available balance")).toEqual({
      kind: "unsupported",
      message: "I can summarize tracked transactions from entries you saved, but linked-account balances are outside this MVP.",
    });
  });

  it("parses bounded correction intents with safe target references", () => {
    expect(parseNaturalLanguageAssistantInput("change that to groceries")).toEqual({
      kind: "recategorize_transaction",
      target: {
        kind: "current",
      },
      categoryPhrase: "groceries",
    });

    expect(parseNaturalLanguageAssistantInput("that was transport")).toEqual({
      kind: "recategorize_transaction",
      target: {
        kind: "current",
      },
      categoryPhrase: "transport",
    });

    expect(parseNaturalLanguageAssistantInput("delete the coffee one")).toEqual({
      kind: "delete_transaction",
      target: {
        kind: "text",
        text: "coffee",
      },
    });

    expect(parseNaturalLanguageAssistantInput("change the coffee one to dining")).toEqual({
      kind: "recategorize_transaction",
      target: {
        kind: "text",
        text: "coffee",
      },
      categoryPhrase: "dining",
    });

    expect(parseNaturalLanguageAssistantInput("mark that correct")).toEqual({
      kind: "mark_correct",
      target: {
        kind: "current",
      },
    });

    expect(parseNaturalLanguageAssistantInput("undo last")).toEqual({
      kind: "restore_transaction",
    });
    expect(parseNaturalLanguageAssistantInput("undo last delete")).toEqual({
      kind: "restore_transaction",
    });
    expect(parseNaturalLanguageAssistantInput("restore last")).toEqual({
      kind: "restore_transaction",
    });
    expect(parseNaturalLanguageAssistantInput("undo")).toEqual({
      kind: "unsupported",
      message: "I can only capture simple expenses, income, recent items, or spending summaries right now.",
    });
  });

  it("does not invent a transaction when the amount is missing or the text is unsupported", () => {
    expect(parseNaturalLanguageAssistantInput("350")).toEqual({
      kind: "clarification_needed",
      reason: "missing_intent",
      message: "Tell me whether that is an expense or income before I save it.",
    });

    expect(parseNaturalLanguageAssistantInput("coffee")).toEqual({
      kind: "clarification_needed",
      reason: "missing_amount",
      message: "I need an amount before I can save that.",
    });

    expect(parseNaturalLanguageAssistantInput("book a flight tomorrow")).toEqual({
      kind: "unsupported",
      message: "I can only capture simple expenses, income, recent items, or spending summaries right now.",
    });
  });
});
