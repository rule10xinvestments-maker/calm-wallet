export type ControlledCategoryDirection = "expense" | "income" | "both";

export type ControlledCategory = {
  id: string;
  slug: string;
  label: string;
  direction: ControlledCategoryDirection;
};

export type CategoryResolutionResult =
  | {
      confidence: "clear";
      reviewRecommendation: "reviewed";
      categoryId: string;
      categorySlug: string;
      categoryLabel: string;
      matchedAlias: string;
    }
  | {
      confidence: "unknown";
      reviewRecommendation: "needs_attention";
      categoryId: null;
      categorySlug: null;
      categoryLabel: null;
      matchedAlias: null;
    };

type CategoryAliasGroup = {
  slug: string;
  aliases: string[];
};

const categoryAliasGroups: CategoryAliasGroup[] = [
  {
    slug: "housing",
    aliases: [
      "rent",
      "apartment",
      "mortgage",
      "housing",
      "utilities",
      "electricity",
      "gas bill",
      "water bill",
      "maintenance",
      "internet bill",
      "chirie",
      "apartament",
      "ipoteca",
      "locuinta",
      "utilitati",
      "curent",
      "electricitate",
      "gaz",
      "factura gaz",
      "factura apa",
      "intretinere",
      "internet",
    ],
  },
  {
    slug: "groceries",
    aliases: [
      "groceries",
      "grocery",
      "supermarket",
      "market",
      "food shopping",
      "food shop",
      "food",
      "water",
      "bottled water",
      "milk",
      "bread",
      "eggs",
      "cheese",
      "yogurt",
      "meat",
      "chicken",
      "fish",
      "vegetables",
      "fruit",
      "apples",
      "bananas",
      "tomatoes",
      "potatoes",
      "rice",
      "pasta",
      "flour",
      "sugar",
      "oil",
      "snacks",
      "chocolate",
      "ketchup",
      "mustard",
      "mayo",
      "mayonnaise",
      "tomato sauce",
      "pasta sauce",
      "sauce",
      "salt",
      "pepper",
      "spices",
      "cereal",
      "butter",
      "margarine",
      "cola",
      "coca cola",
      "pepsi",
      "soda",
      "juice",
      "drinks",
      "beverage",
      "beer",
      "alimente",
      "magazin",
      "piata",
      "apa",
      "apa plata",
      "apa minerala",
      "bidoane apa",
      "lapte",
      "paine",
      "ou",
      "oua",
      "branza",
      "iaurt",
      "carne",
      "pui",
      "peste",
      "legume",
      "fructe",
      "mere",
      "banane",
      "rosii",
      "cartofi",
      "orez",
      "paste",
      "faina",
      "zahar",
      "ulei",
      "ciocolata",
      "mustar",
      "maioneza",
      "sos rosii",
      "sos",
      "sare",
      "piper",
      "condimente",
      "cereale",
      "unt",
      "suc",
      "bautura",
      "bauturi",
      "bere",
    ],
  },
  {
    slug: "dining",
    aliases: [
      "restaurant",
      "cafe",
      "coffee",
      "lunch",
      "dinner",
      "breakfast",
      "takeaway",
      "takeout",
      "delivery",
      "pizza",
      "burger",
      "kebab",
      "hotdog",
      "sandwich",
      "meal",
      "menu",
      "cafenea",
      "cafea",
      "bar",
      "pub",
      "dining",
      "pranz",
      "cina",
      "mic dejun",
      "livrare",
      "comanda mancare",
      "meniu",
      "meniul zilei",
      "shaorma",
      "terasa",
    ],
  },
  {
    slug: "transport",
    aliases: [
      "taxi",
      "uber",
      "bolt",
      "bus",
      "metro",
      "train",
      "tram",
      "transport",
      "fuel",
      "gas station",
      "petrol",
      "diesel",
      "parking",
      "toll",
      "car wash",
      "car repair",
      "lyft",
      "autobuz",
      "metrou",
      "tren",
      "tramvai",
      "carburant",
      "benzina",
      "motorina",
      "combustibil",
      "peco",
      "parcare",
      "taxa drum",
      "spalatorie auto",
      "reparatie masina",
      "service auto",
    ],
  },
  {
    slug: "personal",
    aliases: [
      "cigarettes",
      "cigarette",
      "tobacco",
      "vape",
      "vapes",
      "clothes",
      "clothing",
      "shoes",
      "accessories",
      "haircut",
      "barber",
      "salon",
      "cosmetics",
      "personal care",
      "perfume",
      "deodorant",
      "scooter",
      "electric scooter",
      "bicycle",
      "bike",
      "e-bike",
      "helmet",
      "tigari",
      "tigara",
      "tutun",
      "haine",
      "imbracaminte",
      "pantofi",
      "incaltaminte",
      "accesorii",
      "frizer",
      "frizerie",
      "tuns",
      "cosmetice",
      "parfum",
      "trotineta electrica",
      "trotineta",
      "bicicleta",
      "scuter",
      "casca bicicleta",
    ],
  },
  {
    slug: "health",
    aliases: [
      "pharmacy",
      "medicine",
      "medication",
      "doctor",
      "dentist",
      "hospital",
      "clinic",
      "vitamins",
      "farmacie",
      "medicamente",
      "medic",
      "stomatolog",
      "spital",
      "clinica",
      "vitamine",
    ],
  },
  {
    slug: "shopping",
    aliases: [
      "shopping",
      "store",
      "mall",
      "electronics",
      "phone",
      "laptop",
      "charger",
      "headphones",
      "furniture",
      "home goods",
      "cumparaturi",
      "magazin",
      "electronice",
      "telefon",
      "incarcator",
      "casti",
      "mobila",
      "casa",
    ],
  },
  {
    slug: "entertainment",
    aliases: [
      "cinema",
      "movie",
      "movies",
      "concert",
      "games",
      "gaming",
      "netflix",
      "spotify",
      "subscription",
      "streaming",
      "event",
      "film",
      "filme",
      "jocuri",
      "abonament",
      "eveniment",
    ],
  },
  {
    slug: "salary",
    aliases: [
      "income",
      "salary",
      "wage",
      "paid",
      "paycheck",
      "pay cheque",
      "got paid",
      "bonus",
      "venit",
      "salariu",
      "plata salariu",
      "plata",
    ],
  },
  {
    slug: "self_employment",
    aliases: ["freelance", "freelance income", "contract", "contract income", "client payment", "client"],
  },
  {
    slug: "investment_income",
    aliases: [
      "crypto",
      "bitcoin",
      "btc",
      "ethereum",
      "eth",
      "solana",
      "sol",
      "investment",
      "investments",
      "stocks",
      "shares",
      "dividends",
      "trading",
      "cripto",
      "investitie",
      "investitii",
      "actiuni",
      "dividende",
    ],
  },
  {
    slug: "refunds",
    aliases: ["refund", "reimbursement", "rambursare", "returnare"],
  },
  {
    slug: "gifts",
    aliases: ["gift", "cadou"],
  },
];

const diningContextAliases = [
  "bar",
  "cafe",
  "cafenea",
  "cafea",
  "coffee",
  "dining",
  "pub",
  "restaurant",
  "terasa",
];

const groceryBeverageAliases = [
  "beer",
  "bere",
  "cola",
  "coca cola",
  "pepsi",
  "suc",
  "juice",
  "soda",
  "apa minerala",
  "apa plata",
  "bautura",
  "bauturi",
  "drinks",
  "beverage",
];

function supportsDirection(category: ControlledCategory, transactionType: "expense" | "income") {
  return category.direction === transactionType || category.direction === "both";
}

function normalizePhrase(value: string) {
  return value
    .toLowerCase()
    .replace(/[ăâ]/g, "a")
    .replace(/[ÄƒÃ¢]/g, "a")
    .replace(/î/g, "i")
    .replace(/Ã®/g, "i")
    .replace(/[șş]/g, "s")
    .replace(/[È™ÅŸ]/g, "s")
    .replace(/[țţ]/g, "t")
    .replace(/[È›Å£]/g, "t")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s_-]/g, " ")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function aliasPattern(alias: string) {
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|\\s)${escaped}(\\s|$)`);
}

function phraseIncludesAlias(normalizedPhrase: string, alias: string) {
  const normalizedAlias = normalizePhrase(alias);
  return normalizedPhrase === normalizedAlias || aliasPattern(normalizedAlias).test(normalizedPhrase);
}

function getAliasMatches() {
  return categoryAliasGroups
    .flatMap((group) =>
      group.aliases.map((alias) => ({
        slug: group.slug,
        alias: normalizePhrase(alias),
      })),
    )
    .filter((match) => match.alias)
    .sort((a, b) => b.alias.length - a.alias.length);
}

function resolveSlug(phrase: string) {
  const normalized = normalizePhrase(phrase);

  if (!normalized) {
    return null;
  }

  const diningContextMatch = diningContextAliases.find((alias) => phraseIncludesAlias(normalized, alias));
  const beverageMatch = groceryBeverageAliases.find((alias) => phraseIncludesAlias(normalized, alias));

  if (beverageMatch && diningContextMatch) {
    return { slug: "dining", matchedAlias: beverageMatch };
  }

  for (const match of getAliasMatches()) {
    if (normalized === match.alias || aliasPattern(match.alias).test(normalized)) {
      return match;
    }
  }

  return null;
}

export function resolveControlledCategory(args: {
  phrase: string | null | undefined;
  transactionType: "expense" | "income";
  categories: ControlledCategory[];
}): CategoryResolutionResult {
  const resolved = resolveSlug(args.phrase ?? "");

  if (!resolved) {
    return {
      confidence: "unknown",
      reviewRecommendation: "needs_attention",
      categoryId: null,
      categorySlug: null,
      categoryLabel: null,
      matchedAlias: null,
    };
  }

  const category = args.categories.find(
    (candidate) => candidate.slug === resolved.slug && supportsDirection(candidate, args.transactionType),
  );

  if (!category) {
    return {
      confidence: "unknown",
      reviewRecommendation: "needs_attention",
      categoryId: null,
      categorySlug: null,
      categoryLabel: null,
      matchedAlias: null,
    };
  }

  return {
    confidence: "clear",
    reviewRecommendation: "reviewed",
    categoryId: category.id,
    categorySlug: category.slug,
    categoryLabel: category.label,
    matchedAlias: "matchedAlias" in resolved ? resolved.matchedAlias : resolved.alias,
  };
}
