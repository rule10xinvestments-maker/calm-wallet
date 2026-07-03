import { describe, expect, it } from "vitest";
import { resolveControlledCategory, type ControlledCategory } from "@/domain/assistant/category-resolver";

const categories: ControlledCategory[] = [
  { id: "cat-housing", slug: "housing", label: "Housing", direction: "expense" },
  { id: "cat-utilities", slug: "utilities", label: "Utilities", direction: "expense" },
  { id: "cat-groceries", slug: "groceries", label: "Groceries", direction: "expense" },
  { id: "cat-dining", slug: "dining", label: "Dining", direction: "expense" },
  { id: "cat-transport", slug: "transport", label: "Transport", direction: "expense" },
  { id: "cat-health", slug: "health", label: "Health", direction: "expense" },
  { id: "cat-shopping", slug: "shopping", label: "Shopping", direction: "expense" },
  { id: "cat-personal", slug: "personal", label: "Personal", direction: "expense" },
  { id: "cat-entertainment", slug: "entertainment", label: "Entertainment", direction: "expense" },
  { id: "cat-travel", slug: "travel", label: "Travel", direction: "expense" },
  { id: "cat-education", slug: "education", label: "Education", direction: "expense" },
  { id: "cat-salary", slug: "salary", label: "Salary", direction: "income" },
  { id: "cat-self-employment", slug: "self_employment", label: "Self-employment", direction: "income" },
  { id: "cat-investments", slug: "investment_income", label: "Investments", direction: "both" },
  { id: "cat-refunds", slug: "refunds", label: "Refunds", direction: "income" },
  { id: "cat-gifts", slug: "gifts", label: "Gifts", direction: "both" },
  { id: "cat-transfers", slug: "transfers", label: "Transfers", direction: "both" },
  { id: "cat-sales", slug: "sales", label: "Sales", direction: "income" },
  { id: "cat-rental-income", slug: "rental_income", label: "Rental income", direction: "income" },
  { id: "cat-side-income", slug: "side_income", label: "Side income", direction: "income" },
  { id: "cat-other", slug: "other", label: "Other", direction: "both" },
];

describe("controlled category resolver", () => {
  function expectCategory(
    phrase: string,
    transactionType: "expense" | "income",
    categoryId: string,
    extra: Record<string, unknown> = {},
  ) {
    expect(resolveControlledCategory({ phrase, transactionType, categories })).toEqual(
      expect.objectContaining({
        confidence: "clear",
        categoryId,
        ...extra,
      }),
    );
  }

  it("maps rent and household bills to seeded controlled categories", () => {
    for (const phrase of ["rent", "chirie", "apartment", "apartament", "mortgage", "ipoteca", "ipotec\u0103"]) {
      expect(resolveControlledCategory({ phrase, transactionType: "expense", categories })).toEqual(
        expect.objectContaining({
          confidence: "clear",
          reviewRecommendation: "reviewed",
          categoryId: "cat-housing",
          categorySlug: "housing",
          categoryLabel: "Housing",
        }),
      );
    }

    for (const phrase of [
      "utilities",
      "utilitati",
      "utilit\u0103\u021bi",
      "electricity",
      "electricitate",
      "curent",
      "gas bill",
      "gaz",
      "water bill",
      "intretinere",
      "\u00eentre\u021binere",
    ]) {
      const housingPhrase = ["intretinere", "\u00eentre\u021binere", "maintenance"].includes(phrase);
      expect(resolveControlledCategory({ phrase, transactionType: "expense", categories })).toEqual(
        expect.objectContaining({ confidence: "clear", categoryId: housingPhrase ? "cat-housing" : "cat-utilities" }),
      );
    }
  });

  it("maps common Romanian grocery phrases to Groceries", () => {
    for (const phrase of [
      "chifla",
      "chifle",
      "cartofi",
      "apa",
      "ap\u0103",
      "apa plata",
      "ap\u0103 plat\u0103",
      "apa minerala",
      "ap\u0103 mineral\u0103",
      "bidoane apa",
      "bidoane ap\u0103",
      "paine",
      "p\u00e2ine",
      "franzela",
      "covrig",
      "covrigi",
      "lapte",
      "oua",
      "ou\u0103",
      "carne",
      "pui",
      "peste",
      "pe\u0219te",
      "salam",
      "sunca",
      "\u0219unc\u0103",
      "legume",
      "fructe",
      "mere",
      "banane",
      "rosii",
      "ro\u0219ii",
      "ceapa",
      "ceap\u0103",
      "usturoi",
      "branza",
      "br\u00e2nz\u0103",
      "cascaval",
      "ca\u0219caval",
      "iaurt",
      "bere",
      "cola",
      "coca cola",
      "pepsi",
      "suc",
      "juice",
      "soda",
      "bautura",
      "b\u0103utur\u0103",
      "bauturi",
      "b\u0103uturi",
      "food shopping",
      "eggs",
      "potatoes",
      "rice",
      "pasta",
      "flour",
      "sugar",
      "oil",
      "snacks",
      "chocolate",
      "alimente",
      "piata",
      "pia\u021b\u0103",
      "ou",
      "orez",
      "paste",
      "faina",
      "f\u0103in\u0103",
      "zahar",
      "zah\u0103r",
      "ulei",
      "ciocolata",
      "ciocolat\u0103",
      "ketchup",
      "mustard",
      "mayo",
      "mayonnaise",
      "sauce",
      "tomato sauce",
      "pasta sauce",
      "salt",
      "pepper",
      "spices",
      "cereal",
      "butter",
      "margarine",
      "mustar",
      "mu\u0219tar",
      "maioneza",
      "maionez\u0103",
      "sos",
      "sos rosii",
      "sos ro\u0219ii",
      "sare",
      "piper",
      "condimente",
      "cereale",
      "unt",
      "detergent",
      "sapun",
      "s\u0103pun",
      "sampon",
      "\u0219ampon",
      "hartie",
      "h\u00e2rtie",
      "servetele",
      "\u0219erve\u021bele",
      "kaufland",
      "lidl",
      "carrefour",
      "mega image",
      "profi",
      "auchan",
      "penny",
      "selgros",
      "cora",
    ]) {
      expect(resolveControlledCategory({ phrase, transactionType: "expense", categories })).toEqual(
        expect.objectContaining({ confidence: "clear", categoryId: "cat-groceries" }),
      );
    }
  });

  it("maps dining phrases to Dining and lets dining context override bere", () => {
    for (const phrase of [
      "restaurant",
      "terasa",
      "cafe",
      "cafenea",
      "coffee",
      "cafea",
      "meniul zilei",
      "meniu",
      "pranz",
      "pr\u00e2nz",
      "cina",
      "cin\u0103",
      "mic dejun",
      "pizza",
      "shaorma",
      "kebab",
      "burger",
      "hotdog",
      "fast food",
      "delivery",
      "glovo",
      "tazz",
      "bolt food",
      "kfc",
      "mcdonalds",
      "subway",
      "starbucks",
      "bere la restaurant",
      "bere bar",
    ]) {
      expect(resolveControlledCategory({ phrase, transactionType: "expense", categories })).toEqual(
        expect.objectContaining({ confidence: "clear", reviewRecommendation: "reviewed", categoryId: "cat-dining" }),
      );
    }
  });

  it("lets explicit dining context override grocery beverage aliases", () => {
    for (const phrase of ["cola restaurant 20", "cola cafea restaurant", "cola bar", "bere la bar 30"]) {
      expect(resolveControlledCategory({ phrase, transactionType: "expense", categories })).toEqual(
        expect.objectContaining({ confidence: "clear", reviewRecommendation: "reviewed", categoryId: "cat-dining" }),
      );
    }
  });

  it("maps transport, income, health, personal, shopping, and entertainment aliases", () => {
    for (const phrase of ["taxi", "uber", "bolt", "bus", "autobuz", "metro", "metrou", "train", "tren", "tram", "tramvai", "transport", "bilet", "ticket", "carburant", "benzina", "benzin\u0103", "motorina", "motorin\u0103", "combustibil", "fuel", "gas station", "petrol", "diesel", "parking", "toll", "car wash", "car repair", "peco", "parcare", "rovinieta", "taxa drum", "tax\u0103 drum", "spalatorie auto", "sp\u0103l\u0103torie auto", "reparatie masina", "repara\u021bie ma\u0219in\u0103", "service auto"]) {
      expect(resolveControlledCategory({ phrase, transactionType: "expense", categories })).toEqual(
        expect.objectContaining({ confidence: "clear", categoryId: "cat-transport" }),
      );
    }

    for (const phrase of ["salary", "salariu", "income", "venit", "paid", "plata salariu", "plat\u0103 salariu", "bonus", "wage", "paycheck"]) {
      expect(resolveControlledCategory({ phrase, transactionType: "income", categories })).toEqual(
        expect.objectContaining({ confidence: "clear", categoryId: "cat-salary" }),
      );
    }

    for (const phrase of ["crypto", "bitcoin", "btc", "ethereum", "eth", "solana", "sol", "investment", "investments", "stocks", "shares", "dividends", "trading", "cripto", "investitie", "investi\u021bie", "investitii", "investi\u021bii", "actiuni", "ac\u021biuni", "dividende"]) {
      expect(resolveControlledCategory({ phrase, transactionType: "income", categories })).toEqual(
        expect.objectContaining({ confidence: "clear", categoryId: "cat-investments", categorySlug: "investment_income" }),
      );
    }

    for (const phrase of ["pharmacy", "farmacie", "medicine", "medication", "medicamente", "doctor", "medic", "dentist", "stomatolog", "analize", "consultatie", "consulta\u021bie", "tratament", "treatment", "hospital", "spital", "clinic", "clinica", "clinic\u0103", "vitamins", "vitamine"]) {
      expect(resolveControlledCategory({ phrase, transactionType: "expense", categories })).toEqual(
        expect.objectContaining({ confidence: "clear", categoryId: "cat-health" }),
      );
    }

    for (const phrase of ["shopping", "electronics", "electronice", "phone", "telefon", "laptop", "charger", "incarcator", "\u00eenc\u0103rc\u0103tor", "headphones", "casti", "c\u0103\u0219ti", "furniture", "mobila", "mobil\u0103", "tigari", "\u021big\u0103ri", "tobacco", "emag", "clothes", "haine", "shoes", "incaltaminte", "cigarettes", "tutun", "vape", "accessories", "cosmetics", "electric scooter"]) {
      expect(resolveControlledCategory({ phrase, transactionType: "expense", categories })).toEqual(
        expect.objectContaining({ confidence: "clear", categoryId: "cat-shopping" }),
      );
    }

    for (const phrase of [
      "tricou",
      "pantaloni",
      "tigara",
      "\u021bigar\u0103",
      "cigarette",
      "vapes",
      "trotineta",
      "trotinet\u0103",
      "trotineta electrica",
      "trotinet\u0103 electric\u0103",
      "scooter",
      "bicycle",
      "bike",
      "e-bike",
      "helmet",
      "casca bicicleta",
      "casc\u0103 biciclet\u0103",
      "accesorii",
      "haircut",
      "barber",
      "frizerie",
      "tuns",
      "parfum",
      "deodorant",
      "bicicleta",
      "biciclet\u0103",
      "scuter",
    ]) {
      expect(resolveControlledCategory({ phrase, transactionType: "expense", categories })).toEqual(
        expect.objectContaining({ confidence: "clear", categoryId: "cat-personal" }),
      );
    }

    for (const phrase of ["movie", "movies", "cinema", "concert", "games", "gaming", "jocuri", "netflix", "spotify", "youtube premium", "chatgpt", "openai", "icloud", "google one", "microsoft", "notion", "canva", "adobe", "subscription", "streaming", "event", "abonament", "eveniment"]) {
      expect(resolveControlledCategory({ phrase, transactionType: "expense", categories })).toEqual(
        expect.objectContaining({ confidence: "clear", categoryId: "cat-entertainment" }),
      );
    }
  });

  it("prefers specific phrase matches over generic matches", () => {
    expect(resolveControlledCategory({ phrase: "gas station", transactionType: "expense", categories })).toEqual(
      expect.objectContaining({ confidence: "clear", categoryId: "cat-transport", matchedAlias: "gas station" }),
    );
  });

  it("maps starter vocabulary and pattern hints with confidence-aware review recommendations", () => {
    for (const phrase of ["mustard 5", "mustar 5", "Carrefour 150", "Lidl 80"]) {
      expect(resolveControlledCategory({ phrase, transactionType: "expense", categories })).toEqual(
        expect.objectContaining({ confidence: "clear", reviewRecommendation: "reviewed", categoryId: "cat-groceries" }),
      );
    }

    for (const phrase of ["Digi internet 80", "factura enel 120", "gas bill 100", "factura apa 70"]) {
      expect(resolveControlledCategory({ phrase, transactionType: "expense", categories })).toEqual(
        expect.objectContaining({ confidence: "clear", reviewRecommendation: "reviewed", categoryId: "cat-utilities" }),
      );
    }

    for (const phrase of ["BTCUSDT 100", "ETH/USDT 200", "SOL-USDC 150", "ADA USDT"]) {
      expect(resolveControlledCategory({ phrase, transactionType: "expense", categories })).toEqual(
        expect.objectContaining({ confidence: "clear", reviewRecommendation: "reviewed", categoryId: "cat-investments" }),
      );
    }

    expect(resolveControlledCategory({ phrase: "USDT 100", transactionType: "expense", categories })).toEqual(
      expect.objectContaining({
        confidence: "clear",
        hintConfidence: "medium",
        reviewRecommendation: "needs_attention",
        categoryId: "cat-investments",
      }),
    );
    expect(resolveControlledCategory({ phrase: "transfer 100", transactionType: "expense", categories })).toEqual(
      expect.objectContaining({
        confidence: "clear",
        hintConfidence: "low",
        reviewRecommendation: "needs_attention",
        categoryId: "cat-transfers",
      }),
    );
    expect(resolveControlledCategory({ phrase: "water 10", transactionType: "expense", categories })).toEqual(
      expect.objectContaining({ confidence: "clear", categoryId: "cat-groceries" }),
    );
  });

  it("maps starter income vocabulary type-aware", () => {
    for (const [phrase, categoryId] of [
      ["salary 3000", "cat-salary"],
      ["salariu 3000", "cat-salary"],
      ["refund 50", "cat-refunds"],
      ["sold phone 500", "cat-sales"],
      ["rent received 1200", "cat-rental-income"],
      ["dividend 20", "cat-investments"],
    ] as const) {
      expect(resolveControlledCategory({ phrase, transactionType: "income", categories })).toEqual(
        expect.objectContaining({ confidence: "clear", categoryId }),
      );
    }
  });

  it("maps multilingual grocery vocabulary and grocery merchants", () => {
    for (const phrase of ["mustard 5", "mustar 5", "moutarde 5", "mostaza 5", "paine 10", "pain 4", "pan 4", "Carrefour 150"]) {
      expectCategory(phrase, "expense", "cat-groceries");
    }
  });

  it("maps multilingual dining vocabulary and keeps Bolt Food stronger than Bolt", () => {
    for (const phrase of ["coffee 12", "cafea 12", "café 5", "cafe 5", "restaurante 40", "Tazz 45", "Bolt Food 60"]) {
      expectCategory(phrase, "expense", "cat-dining");
    }
  });

  it("maps multilingual transport vocabulary", () => {
    for (const phrase of ["benzina 200", "essence 50", "gasolina 50", "parking 10", "parcare 10", "peaje 7"]) {
      expectCategory(phrase, "expense", "cat-transport");
    }
  });

  it("maps multilingual utilities vocabulary and bill context", () => {
    for (const phrase of ["Digi internet 80", "factura enel 120", "factura apa 70", "facture eau 30", "factura agua 30", "gas bill 100"]) {
      expectCategory(phrase, "expense", "cat-utilities", { reviewRecommendation: "reviewed" });
    }
  });

  it("maps multilingual health and shopping vocabulary", () => {
    for (const phrase of ["farmacie 35", "pharmacie 35", "farmacia 35", "doctor 200", "dentiste 100", "dentista 100"]) {
      expectCategory(phrase, "expense", "cat-health");
    }

    for (const phrase of ["tigari 30", "tobacco 25", "tabac 25", "tabaco 25", "emag 300"]) {
      expectCategory(phrase, "expense", "cat-shopping");
    }
  });

  it("maps multilingual housing, entertainment, travel, and education vocabulary", () => {
    for (const phrase of ["chirie 1200", "loyer 1200", "alquiler 1200", "renta 1200", "intretinere 300"]) {
      expectCategory(phrase, "expense", "cat-housing");
    }

    for (const phrase of ["netflix 10", "jocuri 20", "cinema 30", "pelicula 12"]) {
      expectCategory(phrase, "expense", "cat-entertainment");
    }

    for (const phrase of ["hotel 300", "aeroport 50", "aéroport 50", "aeropuerto 50", "vacanta 500", "vacances 500", "vacaciones 500"]) {
      expectCategory(phrase, "expense", "cat-travel");
    }

    for (const phrase of ["course 50", "curs 50", "cours 50", "curso 50", "book 20", "carte 20", "livre 20", "libro 20"]) {
      expectCategory(phrase, "expense", "cat-education");
    }
  });

  it("maps multilingual income category vocabulary", () => {
    for (const phrase of ["salary 3000", "salariu 3000", "salaire 3000", "salario 3000"]) {
      expectCategory(phrase, "income", "cat-salary");
    }

    for (const phrase of ["refund 50", "rambursare 50", "remboursement 50", "reembolso 50"]) {
      expectCategory(phrase, "income", "cat-refunds");
    }

    for (const phrase of ["sold phone 500", "vandut telefon 500", "vendu téléphone 500", "vendido telefono 500"]) {
      expectCategory(phrase, "income", "cat-sales");
    }

    for (const phrase of ["rent received 1200", "chirie primita 1200", "loyer recu 1200", "alquiler recibido 1200"]) {
      expectCategory(phrase, "income", "cat-rental-income");
    }
  });

  it("keeps investment patterns and ambiguous words confidence-aware", () => {
    for (const phrase of ["BTCUSDT 100", "ETH/USDT 200", "SOL-USDC 150"]) {
      expectCategory(phrase, "expense", "cat-investments", { reviewRecommendation: "reviewed" });
    }

    for (const phrase of ["dividend 20", "dividende 20", "dividendo 20"]) {
      expectCategory(phrase, "income", "cat-investments", { reviewRecommendation: "reviewed" });
    }

    expectCategory("USDT 100", "expense", "cat-investments", {
      hintConfidence: "medium",
      reviewRecommendation: "needs_attention",
    });
    expectCategory("water 10", "expense", "cat-groceries", {
      hintConfidence: "medium",
      reviewRecommendation: "needs_attention",
    });
    expectCategory("transfer 100", "expense", "cat-transfers", {
      hintConfidence: "low",
      reviewRecommendation: "needs_attention",
    });
    expectCategory("cash 100", "expense", "cat-transfers", {
      hintConfidence: "low",
      reviewRecommendation: "needs_attention",
    });

    const gas = resolveControlledCategory({ phrase: "gas 100", transactionType: "expense", categories });
    expect(gas).toEqual(expect.objectContaining({ hintConfidence: "medium", reviewRecommendation: "needs_attention" }));
    expect(gas).not.toEqual(expect.objectContaining({ hintConfidence: "high" }));
  });

  it("falls back to unknown when the phrase is weak, unsupported, or direction-incompatible", () => {
    expect(resolveControlledCategory({ phrase: "random shop", transactionType: "expense", categories })).toEqual({
      confidence: "unknown",
      reviewRecommendation: "needs_attention",
      categoryId: null,
      categorySlug: null,
      categoryLabel: null,
      matchedAlias: null,
    });

    expect(resolveControlledCategory({ phrase: "paycheck", transactionType: "expense", categories })).toEqual(
      expect.objectContaining({ confidence: "unknown", categoryId: null }),
    );

    expect(
      resolveControlledCategory({
        phrase: "coffee",
        transactionType: "expense",
        categories: categories.filter((category) => category.slug !== "dining"),
      }),
    ).toEqual(expect.objectContaining({ confidence: "unknown", categoryId: null }));
  });
});
