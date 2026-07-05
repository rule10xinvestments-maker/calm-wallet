export type CategoryHintConfidence = "high" | "medium" | "low";

export type CategoryVocabularyHint = {
  slug: string;
  matchedAlias: string;
  confidence: CategoryHintConfidence;
};

type CategoryVocabularyEntry = {
  slug: string;
  confidence: CategoryHintConfidence;
  aliases: string[];
};

const cryptoTickers = ["btc", "eth", "sol", "ada", "bnb", "xrp", "doge", "avax", "dot", "matic", "link", "ltc", "trx", "ton"];
const utilityProviders = ["digi", "orange", "vodafone", "enel", "engie", "eon"];

const categoryVocabulary: CategoryVocabularyEntry[] = [
  {
    slug: "housing",
    confidence: "high",
    aliases: ["rent", "renta", "chirie", "landlord", "apartment", "apartament", "mortgage", "ipoteca", "maintenance", "intretinere", "association", "asociatie", "home", "casa", "repairs", "reparatii"],
  },
  {
    slug: "groceries",
    confidence: "high",
    aliases: ["groceries", "grocery", "supermarket", "market", "food shopping", "food shop", "food", "alimente", "mancare", "bread", "paine", "pain", "pan", "milk", "lapte", "eggs", "oua", "cheese", "branza", "meat", "carne", "vegetables", "legume", "fruit", "fructe", "cola", "mustard", "mustar", "bidoane apa", "apa plata", "apa minerala", "kaufland", "lidl", "carrefour", "profi", "mega image"],
  },
  {
    slug: "groceries",
    confidence: "medium",
    aliases: ["water", "apa"],
  },
  {
    slug: "dining",
    confidence: "high",
    aliases: ["restaurant", "cafe", "cafes", "cafés", "coffee", "coffees", "cafea", "cafele", "lunch", "dinner", "breakfast", "pizza", "burger", "shaorma", "kebab", "takeaway", "delivery", "glovo", "tazz", "bolt food", "food delivery", "meniul zilei"],
  },
  {
    slug: "transport",
    confidence: "high",
    aliases: ["transport", "taxi", "uber", "bolt", "bus", "autobuz", "tram", "tramvai", "metro", "metrou", "train", "tren", "fuel", "benzina", "motorina", "gas station", "peco", "parking", "parcare", "toll", "rovinieta"],
  },
  {
    slug: "transport",
    confidence: "medium",
    aliases: ["gas"],
  },
  {
    slug: "utilities",
    confidence: "high",
    aliases: ["electricity", "electricitate", "curent", "power", "gas bill", "gaz", "gaze", "water bill", "factura apa", "internet", "phone bill", "mobile", "vodafone", "orange", "digi", "enel", "engie", "eon", "utility", "utilities", "utilitati", "utilități", "factura"],
  },
  {
    slug: "health",
    confidence: "high",
    aliases: ["pharmacy", "farmacie", "medicine", "medicamente", "doctor", "medic", "dentist", "dental", "hospital", "spital", "clinic", "clinica", "therapy", "terapie", "glasses", "ochelari", "vitamins", "prescription"],
  },
  {
    slug: "shopping",
    confidence: "high",
    aliases: ["shopping", "clothes", "haine", "shoes", "pantofi", "incaltaminte", "mall", "emag", "amazon", "altex", "dedeman", "ikea", "cosmetics", "tobacco", "tutun", "tigari", "cigarettes", "vape", "accessories", "electronics", "telefon", "electric scooter"],
  },
  {
    slug: "entertainment",
    confidence: "high",
    aliases: ["movie", "cinema", "film", "netflix", "spotify", "youtube", "game", "games", "gaming", "concert", "event", "party", "club", "subscription", "abonament", "fun", "chatgpt", "openai"],
  },
  {
    slug: "travel",
    confidence: "high",
    aliases: ["hotel", "booking", "airbnb", "flight", "zbor", "plane", "avion", "airport", "aeroport", "vacation", "holiday", "vacanta", "trip", "travel", "luggage", "passport", "taxi airport"],
  },
  {
    slug: "education",
    confidence: "high",
    aliases: ["school", "scoala", "course", "curs", "book", "carte", "books", "manual", "university", "facultate", "tuition", "meditatii", "training", "exam", "examen", "udemy"],
  },
  {
    slug: "gifts",
    confidence: "medium",
    aliases: ["gift", "cadou", "present", "donation", "donatie", "birthday", "zi de nastere", "flowers", "flori"],
  },
  {
    slug: "transfers",
    confidence: "low",
    aliases: ["transfer", "revolut", "bank transfer", "sent", "trimis", "received", "primit", "iban", "topup", "top up", "withdraw", "withdrawal", "atm", "cash", "numerar"],
  },
  {
    slug: "investment_income",
    confidence: "high",
    aliases: ["investment", "investitie", "investitii", "stocks", "shares", "stock", "etf", "crypto", "bitcoin", "btc", "ethereum", "eth", "solana", "sol", "binance", "coinbase", "trading", "staking", "broker", "dividend", "dividends", "dobanda"],
  },
  {
    slug: "investment_income",
    confidence: "medium",
    aliases: ["usdt", "usdc"],
  },
  {
    slug: "other",
    confidence: "low",
    aliases: ["misc", "diverse", "other", "unknown", "unclear"],
  },
  {
    slug: "housing",
    confidence: "high",
    aliases: ["proprietar", "proprietaire", "propietario", "maison", "logement", "bail", "alquiler", "propietario", "apartamento", "hipoteca", "mantenimiento", "reparacion", "vivienda", "contrato", "loyer", "appartement", "hypotheque", "entretien", "reparation", "locuinta"],
  },
  {
    slug: "groceries",
    confidence: "high",
    aliases: ["comestibles", "supermarche", "supermercado", "marche", "mercado", "nourriture", "comida", "courses", "oeufs", "huevos", "fromage", "queso", "viande", "legumes", "verduras", "frutas", "moutarde", "mostaza", "riz", "arroz", "pates", "huile", "aceite", "sucre", "azucar"],
  },
  {
    slug: "dining",
    confidence: "high",
    aliases: ["restaurante", "cafeteria", "dejeuner", "diner", "petit dejeuner", "almuerzo", "desayuno", "hamburguesa", "livraison", "entrega", "domicilio", "repas", "plat", "plato", "mancare livrata"],
  },
  {
    slug: "transport",
    confidence: "high",
    aliases: ["transporte", "autobus", "tranvia", "essence", "combustible", "gasolina", "gasolinera", "station service", "estacionamiento", "aparcamiento", "peage", "peaje", "billet", "billete"],
  },
  {
    slug: "utilities",
    confidence: "high",
    aliases: ["electricite", "electricidad", "courant", "luz", "facture gaz", "factura gas", "facture eau", "factura agua", "telephone", "telefono", "movil", "services publics", "servicios", "facture", "heating", "incalzire", "chauffage", "calefaccion"],
  },
  {
    slug: "health",
    confidence: "high",
    aliases: ["pharmacie", "farmacia", "medicament", "medicamento", "medecin", "medico", "docteur", "dentiste", "dentista", "hopital", "clinique", "therapie", "terapia", "lunettes", "gafas", "lentes", "vitamines", "vitaminas", "ordonnance", "receta", "medical", "traitement", "tratamiento"],
  },
  {
    slug: "shopping",
    confidence: "high",
    aliases: ["achats", "compras", "vetements", "ropa", "chaussures", "zapatos", "centre commercial", "centro comercial", "cosmetiques", "cosmeticos", "tabac", "tabaco", "cigarrillos", "accessoires", "accesorios", "electronique", "electronica", "meubles", "muebles", "appliance", "electrocasnice", "tienda"],
  },
  {
    slug: "entertainment",
    confidence: "high",
    aliases: ["pelicula", "cine", "joc", "jeu", "jeux", "juego", "juegos", "evenement", "evento", "fete", "fiesta", "abonnement", "suscripcion", "distractie", "divertissement", "entretenimiento"],
  },
  {
    slug: "travel",
    confidence: "high",
    aliases: ["vol", "vuelo", "aeropuerto", "concediu", "vacances", "vacaciones", "calatorie", "voyage", "viaje", "bagaj", "bagage", "equipaje", "pasaport", "passeport", "pasaporte", "visa"],
  },
  {
    slug: "education",
    confidence: "high",
    aliases: ["ecole", "escuela", "cours", "curso", "livre", "libro", "carti", "livres", "libros", "universitate", "universite", "universidad", "taxa studii", "frais scolarite", "matricula", "formation", "formacion", "lesson", "lectie", "lecon", "leccion", "study", "studiu", "etude", "estudio", "class", "clasa", "classe"],
  },
  {
    slug: "gifts",
    confidence: "medium",
    aliases: ["dar", "cadeau", "regalo", "presente", "don", "donacion", "anniversaire", "cumpleanos", "fleurs", "flores", "charity", "caritate", "charite", "caridad"],
  },
  {
    slug: "transfers",
    confidence: "low",
    aliases: ["transfer bancar", "virement", "transfert", "transferencia", "envoye", "enviado", "recu", "recibido", "recharge", "recarga", "deposit", "depunere", "depot", "deposito", "retras", "retragere", "retrait", "retiro", "bancomat", "distributeur", "cajero", "especes", "efectivo"],
  },
  {
    slug: "salary",
    confidence: "high",
    aliases: ["salary", "salariu", "salaire", "salario", "wage", "wages", "paycheck", "payroll", "venit", "income", "paid salary", "bonus", "prima"],
  },
  {
    slug: "salary",
    confidence: "high",
    aliases: ["leafa", "plata salariu", "paie", "remuneration", "revenu", "prime", "sueldo", "nomina", "ingreso", "paga"],
  },
  {
    slug: "self_employment",
    confidence: "high",
    aliases: ["freelance", "freelancer", "client", "invoice", "factura emisa", "contract", "consulting", "consultanta", "project payment", "gig"],
  },
  {
    slug: "self_employment",
    confidence: "high",
    aliases: ["independant", "autonomo", "cliente", "facture", "factura", "conseil", "consultoria", "contrat", "contrato", "proiect", "plata proiect", "projet", "proyecto", "mission", "encargo"],
  },
  {
    slug: "refunds",
    confidence: "high",
    aliases: ["refund", "rambursare", "remboursement", "return", "returned", "chargeback", "cashback", "reimbursement", "compensatie", "restituit"],
  },
  {
    slug: "refunds",
    confidence: "high",
    aliases: ["reembolso", "retur", "retour", "devolucion", "compensare", "compensation", "compensacion", "despagubire", "indemnisation", "restitue", "devuelto"],
  },
  {
    slug: "sales",
    confidence: "high",
    aliases: ["sold", "sale", "vanzare", "vandut", "marketplace", "olx", "ebay", "facebook marketplace"],
  },
  {
    slug: "sales",
    confidence: "high",
    aliases: ["vendu", "vente", "vendido", "venta", "leboncoin", "wallapop"],
  },
  {
    slug: "rental_income",
    confidence: "high",
    aliases: ["rent received", "chirie primita", "tenant", "chirias", "rental income", "property income"],
  },
  {
    slug: "rental_income",
    confidence: "high",
    aliases: ["venit chirie", "loyer recu", "revenu locatif", "locataire", "alquiler recibido", "renta recibida", "ingreso alquiler", "inquilino"],
  },
  {
    slug: "side_income",
    confidence: "high",
    aliases: ["side income", "side job", "tips", "bacsis", "extra work", "overtime", "part time", "part-time"],
  },
  {
    slug: "side_income",
    confidence: "high",
    aliases: ["venit extra", "job secundar", "ore suplimentare", "munca extra", "revenu complementaire", "petit boulot", "pourboire", "heures supplementaires", "temps partiel", "ingreso extra", "trabajo extra", "propina", "horas extra", "medio tiempo", "trabajo secundario"],
  },
  {
    slug: "other_income",
    confidence: "low",
    aliases: ["other income", "unknown income", "misc income", "venit divers", "venit necunoscut", "alt venit", "autre revenu", "revenu inconnu", "revenu divers", "otro ingreso", "ingreso desconocido", "ingreso varios"],
  },
];

const diningContextAliases = ["bar", "cafe", "cafenea", "cafea", "coffee", "dining", "pub", "restaurant", "terasa"];
const groceryBeverageAliases = ["beer", "bere", "cola", "coca cola", "pepsi", "suc", "juice", "soda", "apa minerala", "apa plata", "bautura", "bauturi", "drinks", "beverage"];

export function normalizeCategoryVocabularyPhrase(value: string) {
  return value
    .toLowerCase()
    .replace(/[ÄƒÃ¢]/g, "a")
    .replace(/[Ã„Æ’ÃƒÂ¢]/g, "a")
    .replace(/Ã®/g, "i")
    .replace(/ÃƒÂ®/g, "i")
    .replace(/[È™ÅŸ]/g, "s")
    .replace(/[Ãˆâ„¢Ã…Å¸]/g, "s")
    .replace(/[È›Å£]/g, "t")
    .replace(/[Ãˆâ€ºÃ…Â£]/g, "t")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s/_-]/g, " ")
    .replace(/[_/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function aliasPattern(alias: string) {
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|\\s)${escaped}(\\s|$)`);
}

function phraseIncludesAlias(normalizedPhrase: string, alias: string) {
  const normalizedAlias = normalizeCategoryVocabularyPhrase(alias);
  return normalizedPhrase === normalizedAlias || aliasPattern(normalizedAlias).test(normalizedPhrase);
}

function getAliasMatches() {
  return categoryVocabulary
    .flatMap((entry) =>
      entry.aliases.map((alias) => ({
        slug: entry.slug,
        alias: normalizeCategoryVocabularyPhrase(alias),
        confidence: entry.confidence,
      })),
    )
    .filter((match) => match.alias)
    .sort((a, b) => b.alias.length - a.alias.length);
}

function findPatternHint(normalizedPhrase: string): CategoryVocabularyHint | null {
  const cryptoPairPattern = new RegExp(`(^|\\s)(?:${cryptoTickers.join("|")})\\s*(?:usdt|usdc)(\\s|$)|(^|\\s)(?:usdt|usdc)\\s*(?:${cryptoTickers.join("|")})(\\s|$)`);

  if (cryptoPairPattern.test(normalizedPhrase)) {
    return { slug: "investment_income", matchedAlias: "crypto pair", confidence: "high" };
  }

  for (const salesPhrase of ["sold", "vandut", "vendu", "vendido"]) {
    if (phraseIncludesAlias(normalizedPhrase, salesPhrase)) {
      return { slug: "sales", matchedAlias: salesPhrase, confidence: "high" };
    }
  }

  for (const dividendPhrase of ["dividend", "dividends", "dividende", "dividendes", "dividendo", "dividendos"]) {
    if (phraseIncludesAlias(normalizedPhrase, dividendPhrase)) {
      return { slug: "investment_income", matchedAlias: dividendPhrase, confidence: "high" };
    }
  }

  if (phraseIncludesAlias(normalizedPhrase, "factura") && utilityProviders.some((provider) => phraseIncludesAlias(normalizedPhrase, provider))) {
    return { slug: "utilities", matchedAlias: "provider bill", confidence: "high" };
  }

  if (phraseIncludesAlias(normalizedPhrase, "food shopping") || phraseIncludesAlias(normalizedPhrase, "food shop")) {
    return { slug: "groceries", matchedAlias: "food shopping", confidence: "high" };
  }

  for (const billPhrase of ["gas bill", "factura gaz", "factura gaze", "facture gaz", "factura gas", "water bill", "factura apa", "facture eau", "factura agua"]) {
    if (phraseIncludesAlias(normalizedPhrase, billPhrase)) {
      return { slug: "utilities", matchedAlias: billPhrase, confidence: "high" };
    }
  }

  if (phraseIncludesAlias(normalizedPhrase, "bolt food")) {
    return { slug: "dining", matchedAlias: "bolt food", confidence: "high" };
  }

  if (phraseIncludesAlias(normalizedPhrase, "fast food")) {
    return { slug: "dining", matchedAlias: "fast food", confidence: "high" };
  }

  if (phraseIncludesAlias(normalizedPhrase, "comanda mancare")) {
    return { slug: "dining", matchedAlias: "comanda mancare", confidence: "high" };
  }

  if (phraseIncludesAlias(normalizedPhrase, "electric scooter")) {
    return { slug: "shopping", matchedAlias: "electric scooter", confidence: "high" };
  }

  return null;
}

export function findCategoryVocabularyHint(phrase: string | null | undefined): CategoryVocabularyHint | null {
  const normalized = normalizeCategoryVocabularyPhrase(phrase ?? "");

  if (!normalized) {
    return null;
  }

  const patternHint = findPatternHint(normalized);

  if (patternHint) {
    return patternHint;
  }

  const diningContextMatch = diningContextAliases.find((alias) => phraseIncludesAlias(normalized, alias));
  const beverageMatch = groceryBeverageAliases.find((alias) => phraseIncludesAlias(normalized, alias));

  if (beverageMatch && diningContextMatch) {
    return { slug: "dining", matchedAlias: beverageMatch, confidence: "high" };
  }

  for (const match of getAliasMatches()) {
    if (normalized === match.alias || aliasPattern(match.alias).test(normalized)) {
      return {
        slug: match.slug,
        matchedAlias: match.alias,
        confidence: match.confidence,
      };
    }
  }

  return null;
}
