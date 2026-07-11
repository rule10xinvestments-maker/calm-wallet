import { normalizeLocale, type SupportedLocale } from "@/lib/i18n";

export type NotificationCopy = {
  title: string;
  body: string;
};

export const dailyReminderNotificationRegistry = {
  en: [
    {
      title: "One small habit",
      body: "A few seconds now can make your month much clearer.",
    },
    {
      title: "One minute now",
      body: "It means fewer questions at the end of the month.",
    },
    {
      title: "How did today go?",
      body: "Save today's money while it's still fresh.",
    },
    {
      title: "Keep your notebook up to date",
      body: "Your future self will have a clearer picture.",
    },
    {
      title: "Small notes. Big picture.",
      body: "Every entry helps your monthly insights become more accurate.",
    },
    {
      title: "Ready when you are",
      body: "Whenever you have a moment, today's notes are waiting.",
    },
    {
      title: "Don't lose today's story",
      body: "Add today's spending and income before the details fade.",
    },
    {
      title: "A quiet money check-in",
      body: "One quick note can keep your records easier to trust.",
    },
    {
      title: "Fresh details help",
      body: "Today's entries are easiest while the day is still clear.",
    },
    {
      title: "A clearer month starts here",
      body: "A small update today gives your insights better context.",
    },
    {
      title: "Make tomorrow easier",
      body: "Capture today's money notes before they become guesses.",
    },
    {
      title: "Your notebook is open",
      body: "Add what changed today, in as much detail as you like.",
    },
    {
      title: "A simple daily pause",
      body: "Noting today's money can make the bigger picture calmer.",
    },
    {
      title: "Tiny entry, useful record",
      body: "A short note now can save you from sorting it out later.",
    },
    {
      title: "Today is still fresh",
      body: "Record what you spent or earned while it is easy to remember.",
    },
    {
      title: "Keep the picture clear",
      body: "A few fresh entries help Calm Wallet reflect real life better.",
    },
    {
      title: "A gentle end-of-day note",
      body: "If money moved today, you can save it in a moment.",
    },
    {
      title: "Little notes add up",
      body: "Small daily records make monthly patterns easier to see.",
    },
    {
      title: "What changed today?",
      body: "Add any spending or income that would help your notebook stay current.",
    },
    {
      title: "A calmer month later",
      body: "A brief update today can make review time feel simpler.",
    },
    {
      title: "Capture the easy details",
      body: "The best time to note today's money is while it still feels obvious.",
    },
    {
      title: "A useful little record",
      body: "Today's entries help turn scattered moments into a clearer view.",
    },
    {
      title: "Before the day blurs",
      body: "Save the money notes you may want to understand later.",
    },
    {
      title: "Your daily money note",
      body: "A small update keeps Calm Wallet closer to your real month.",
    },
  ],
  ro: [
    {
      title: "Un obicei mic",
      body: "Câteva secunde acum îți pot face luna mult mai clară.",
    },
    {
      title: "Un minut acum",
      body: "Înseamnă mai puține întrebări la final de lună.",
    },
    {
      title: "Cum a fost ziua?",
      body: "Salvează banii de azi cât detaliile sunt încă proaspete.",
    },
    {
      title: "Ține caietul la zi",
      body: "Mai târziu vei avea o imagine mai clară.",
    },
    {
      title: "Note mici. Imagine mare.",
      body: "Fiecare intrare ajută perspectivele lunare să fie mai exacte.",
    },
    {
      title: "Când ești pregătit",
      body: "Când ai un moment, notițele de azi te așteaptă.",
    },
    {
      title: "Nu pierde povestea zilei",
      body: "Adaugă cheltuielile și veniturile de azi înainte ca detaliile să se estompeze.",
    },
    {
      title: "O verificare liniștită",
      body: "O notă rapidă poate face evidența mai ușor de urmărit.",
    },
    {
      title: "Detaliile proaspete ajută",
      body: "Intrările de azi sunt mai ușor de salvat cât ziua e încă clară.",
    },
    {
      title: "O lună mai clară începe aici",
      body: "O mică actualizare azi oferă mai mult context perspectivelor tale.",
    },
    {
      title: "Fă ziua de mâine mai simplă",
      body: "Notează banii de azi înainte să devină presupuneri.",
    },
    {
      title: "Caietul tău e deschis",
      body: "Adaugă ce s-a schimbat azi, cu câte detalii vrei.",
    },
    {
      title: "O pauză zilnică simplă",
      body: "Notarea banilor de azi poate face imaginea de ansamblu mai calmă.",
    },
    {
      title: "Intrare mică, evidență utilă",
      body: "O notă scurtă acum te poate scuti de clarificări mai târziu.",
    },
    {
      title: "Ziua e încă proaspătă",
      body: "Înregistrează ce ai cheltuit sau primit cât e ușor de reținut.",
    },
    {
      title: "Păstrează imaginea clară",
      body: "Câteva intrări proaspete ajută Calm Wallet să reflecte mai bine viața reală.",
    },
    {
      title: "O notă blândă de seară",
      body: "Dacă au fost mișcări de bani azi, le poți salva într-un moment.",
    },
    {
      title: "Notele mici se adună",
      body: "Evidențele zilnice fac tiparele lunare mai ușor de văzut.",
    },
    {
      title: "Ce s-a schimbat azi?",
      body: "Adaugă cheltuielile sau veniturile care îți țin caietul la zi.",
    },
    {
      title: "O lună mai calmă mai târziu",
      body: "O actualizare scurtă azi poate face revizuirea mai simplă.",
    },
    {
      title: "Prinde detaliile ușoare",
      body: "Cel mai bun moment pentru banii de azi este cât încă par evidenți.",
    },
    {
      title: "O mică evidență utilă",
      body: "Intrările de azi transformă momentele risipite într-o imagine mai clară.",
    },
    {
      title: "Înainte ca ziua să se amestece",
      body: "Salvează notițele despre bani pe care vei vrea să le înțelegi mai târziu.",
    },
    {
      title: "Nota ta zilnică despre bani",
      body: "O mică actualizare ține Calm Wallet mai aproape de luna ta reală.",
    },
  ],
  fr: [
    {
      title: "Une petite habitude",
      body: "Quelques secondes maintenant peuvent rendre votre mois beaucoup plus clair.",
    },
    {
      title: "Une minute maintenant",
      body: "C'est moins de questions à la fin du mois.",
    },
    {
      title: "Comment s'est passée la journée ?",
      body: "Notez l'argent d'aujourd'hui tant que c'est encore frais.",
    },
    {
      title: "Gardez votre carnet à jour",
      body: "Vous aurez une vision plus claire plus tard.",
    },
    {
      title: "Petites notes. Vue d'ensemble.",
      body: "Chaque entrée rend vos aperçus mensuels plus précis.",
    },
    {
      title: "Quand vous voulez",
      body: "Quand vous avez un moment, les notes du jour vous attendent.",
    },
    {
      title: "Ne laissez pas filer la journée",
      body: "Ajoutez les dépenses et revenus du jour avant que les détails s'estompent.",
    },
    {
      title: "Un point d'argent tranquille",
      body: "Une note rapide peut rendre vos comptes plus faciles à suivre.",
    },
    {
      title: "Les détails frais aident",
      body: "Les entrées du jour sont plus simples tant que la journée est claire.",
    },
    {
      title: "Un mois plus clair commence ici",
      body: "Une petite mise à jour aujourd'hui donne plus de contexte à vos aperçus.",
    },
    {
      title: "Simplifiez demain",
      body: "Saisissez les notes d'argent du jour avant qu'elles deviennent des suppositions.",
    },
    {
      title: "Votre carnet est ouvert",
      body: "Ajoutez ce qui a changé aujourd'hui, avec le niveau de détail souhaité.",
    },
    {
      title: "Une pause quotidienne simple",
      body: "Noter l'argent du jour peut rendre la vue d'ensemble plus sereine.",
    },
    {
      title: "Petite entrée, trace utile",
      body: "Une courte note maintenant peut éviter de tout reconstituer plus tard.",
    },
    {
      title: "La journée est encore fraîche",
      body: "Notez ce que vous avez dépensé ou gagné pendant que c'est facile à retenir.",
    },
    {
      title: "Gardez l'image nette",
      body: "Quelques entrées récentes aident Calm Wallet à mieux refléter la vraie vie.",
    },
    {
      title: "Une note douce de fin de journée",
      body: "Si de l'argent a bougé aujourd'hui, vous pouvez l'enregistrer en un instant.",
    },
    {
      title: "Les petites notes s'additionnent",
      body: "Les traces quotidiennes rendent les tendances mensuelles plus faciles à voir.",
    },
    {
      title: "Qu'est-ce qui a changé aujourd'hui ?",
      body: "Ajoutez les dépenses ou revenus qui gardent votre carnet à jour.",
    },
    {
      title: "Un mois plus calme ensuite",
      body: "Une brève mise à jour aujourd'hui peut simplifier le moment du bilan.",
    },
    {
      title: "Gardez les détails faciles",
      body: "Le meilleur moment pour noter l'argent du jour, c'est quand tout paraît évident.",
    },
    {
      title: "Une petite trace utile",
      body: "Les entrées du jour transforment les moments épars en une vue plus claire.",
    },
    {
      title: "Avant que la journée se brouille",
      body: "Enregistrez les notes d'argent que vous voudrez comprendre plus tard.",
    },
    {
      title: "Votre note d'argent du jour",
      body: "Une petite mise à jour rapproche Calm Wallet de votre mois réel.",
    },
  ],
  es: [
    {
      title: "Un hábito pequeño",
      body: "Unos segundos ahora pueden hacer que tu mes sea mucho más claro.",
    },
    {
      title: "Un minuto ahora",
      body: "Significa menos preguntas al final del mes.",
    },
    {
      title: "¿Cómo fue el día?",
      body: "Guarda el dinero de hoy mientras aún lo tienes fresco.",
    },
    {
      title: "Mantén tu cuaderno al día",
      body: "Más adelante tendrás una imagen más clara.",
    },
    {
      title: "Notas pequeñas. Imagen grande.",
      body: "Cada registro ayuda a que tus perspectivas mensuales sean más precisas.",
    },
    {
      title: "Cuando quieras",
      body: "Cuando tengas un momento, las notas de hoy te esperan.",
    },
    {
      title: "No pierdas la historia de hoy",
      body: "Añade los gastos e ingresos de hoy antes de que los detalles se diluyan.",
    },
    {
      title: "Una revisión tranquila",
      body: "Una nota rápida puede hacer que tus registros sean más fáciles de confiar.",
    },
    {
      title: "Los detalles frescos ayudan",
      body: "Los registros de hoy son más fáciles mientras el día sigue claro.",
    },
    {
      title: "Un mes más claro empieza aquí",
      body: "Una pequeña actualización hoy da mejor contexto a tus perspectivas.",
    },
    {
      title: "Haz más fácil mañana",
      body: "Captura las notas de dinero de hoy antes de que sean suposiciones.",
    },
    {
      title: "Tu cuaderno está abierto",
      body: "Añade lo que cambió hoy, con el detalle que prefieras.",
    },
    {
      title: "Una pausa diaria sencilla",
      body: "Anotar el dinero de hoy puede hacer más tranquila la vista general.",
    },
    {
      title: "Registro pequeño, ayuda útil",
      body: "Una nota breve ahora puede evitarte reconstruirlo más tarde.",
    },
    {
      title: "El día sigue fresco",
      body: "Registra lo que gastaste o recibiste mientras es fácil de recordar.",
    },
    {
      title: "Mantén clara la imagen",
      body: "Unos registros recientes ayudan a Calm Wallet a reflejar mejor la vida real.",
    },
    {
      title: "Una nota suave al final del día",
      body: "Si hoy se movió dinero, puedes guardarlo en un momento.",
    },
    {
      title: "Las notas pequeñas suman",
      body: "Los registros diarios hacen que los patrones mensuales sean más fáciles de ver.",
    },
    {
      title: "¿Qué cambió hoy?",
      body: "Añade cualquier gasto o ingreso que ayude a mantener tu cuaderno al día.",
    },
    {
      title: "Un mes más tranquilo después",
      body: "Una breve actualización hoy puede hacer más simple la revisión.",
    },
    {
      title: "Captura los detalles fáciles",
      body: "El mejor momento para anotar el dinero de hoy es cuando aún parece obvio.",
    },
    {
      title: "Una pequeña pista útil",
      body: "Los registros de hoy convierten momentos sueltos en una vista más clara.",
    },
    {
      title: "Antes de que el día se mezcle",
      body: "Guarda las notas de dinero que quizá quieras entender más adelante.",
    },
    {
      title: "Tu nota diaria de dinero",
      body: "Una pequeña actualización mantiene Calm Wallet más cerca de tu mes real.",
    },
  ],
} as const satisfies Record<SupportedLocale, readonly NotificationCopy[]>;

export const notificationCopyTemplates = {
  test: {
    title: "Calm Wallet is ready",
    body: "Notifications are working.",
  },
  dailyReminder: dailyReminderNotificationRegistry.en,
  monthlyReport: [
    {
      title: "Your month is ready",
      body: "See what changed in your money this month.",
    },
    {
      title: "Monthly clarity is ready",
      body: "Review your income, spending, and trends.",
    },
    {
      title: "A new month, a clearer view",
      body: "Take a quick look at last month's money.",
    },
  ],
} as const;

const blockedTone = /\b(urgent|hurry|warning|shame|failed|bad|must|now!)\b/i;

export function assertCalmNotificationCopy(copy: { title: string; body: string }) {
  if (blockedTone.test(copy.title) || blockedTone.test(copy.body)) {
    throw new Error("Notification copy must stay calm and non-urgent.");
  }

  return copy;
}

function dayOfYear(date: Date) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  return Math.floor((date.getTime() - start) / 86_400_000);
}

function stableHash(value: string) {
  let hash = 0;

  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return hash;
}

export function getDailyReminderCopy(
  now: Date,
  options: { locale?: string | null; userId?: string | null; dayKey?: string | null } = {},
) {
  const locale = normalizeLocale(options.locale);
  const variants = dailyReminderNotificationRegistry[locale] ?? dailyReminderNotificationRegistry.en;
  const rotationKey = `${options.userId?.trim() || "calm-wallet"}:${options.dayKey?.trim() || dayOfYear(now)}`;
  return variants[stableHash(rotationKey) % variants.length];
}

export function getMonthlyReportCopy(now: Date) {
  return notificationCopyTemplates.monthlyReport[now.getUTCMonth() % notificationCopyTemplates.monthlyReport.length];
}

export function getRecurringEntryAddedCopy(name?: string | null) {
  const title = "Recurring entry added";
  const trimmedName = name?.trim();

  return {
    title,
    body: trimmedName
      ? `Your usual ${trimmedName} transaction was automatically added to Activity.`
      : "A repeating transaction was automatically added to Activity.",
  };
}

export function getLimitAlertCopy(categoryName: string, threshold: "seventy_percent" | "exceeded") {
  return threshold === "exceeded"
    ? {
        title: "Limit passed",
        body: `${categoryName} is now over your planned limit.`,
      }
    : {
        title: "Limit check-in",
        body: `${categoryName} is getting close to your planned limit.`,
      };
}
