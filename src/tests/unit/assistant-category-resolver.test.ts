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
  { id: "cat-salary", slug: "salary", label: "Salary", direction: "income" },
  { id: "cat-self-employment", slug: "self_employment", label: "Self-employment", direction: "income" },
  { id: "cat-investments", slug: "investment_income", label: "Investments", direction: "income" },
];

describe("controlled category resolver", () => {
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
      expect(resolveControlledCategory({ phrase, transactionType: "expense", categories })).toEqual(
        expect.objectContaining({ confidence: "clear", reviewRecommendation: "reviewed", categoryId: "cat-housing" }),
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
        expect.objectContaining({ confidence: "clear", reviewRecommendation: "reviewed", categoryId: "cat-groceries" }),
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

    for (const phrase of ["shopping", "electronics", "electronice", "phone", "telefon", "laptop", "charger", "incarcator", "\u00eenc\u0103rc\u0103tor", "headphones", "casti", "c\u0103\u0219ti", "furniture", "mobila", "mobil\u0103"]) {
      expect(resolveControlledCategory({ phrase, transactionType: "expense", categories })).toEqual(
        expect.objectContaining({ confidence: "clear", categoryId: "cat-shopping" }),
      );
    }

    for (const phrase of [
      "clothes",
      "haine",
      "tricou",
      "pantaloni",
      "shoes",
      "incaltaminte",
      "\u00eenc\u0103l\u021b\u0103minte",
      "tigari",
      "\u021big\u0103ri",
      "tigara",
      "\u021bigar\u0103",
      "cigarettes",
      "cigarette",
      "tobacco",
      "tutun",
      "vape",
      "vapes",
      "trotineta",
      "trotinet\u0103",
      "trotineta electrica",
      "trotinet\u0103 electric\u0103",
      "electric scooter",
      "scooter",
      "bicycle",
      "bike",
      "e-bike",
      "helmet",
      "casca bicicleta",
      "casc\u0103 biciclet\u0103",
      "accessories",
      "accesorii",
      "haircut",
      "barber",
      "frizerie",
      "tuns",
      "cosmetics",
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
