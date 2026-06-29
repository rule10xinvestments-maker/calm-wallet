import { fileURLToPath } from "node:url";

export type RequiredSchemaEntry =
  | {
      type: "table";
      table: string;
      schema?: string;
    }
  | {
      type: "column";
      table: string;
      column: string;
      schema?: string;
    };

export type SchemaCheckResult =
  | {
      status: "passed";
      checked: string[];
      message: string;
    }
  | {
      status: "failed";
      missing: string[];
      message: string;
    }
  | {
      status: "skipped";
      message: string;
    };

type FetchLike = (input: string, init?: { headers?: Record<string, string> }) => Promise<{ ok: boolean; status: number }>;
type SchemaCheckEnv = Record<string, string | undefined>;

export const REQUIRED_SCHEMA: RequiredSchemaEntry[] = [
  {
    table: "recurring_rules",
    type: "table",
  },
  {
    table: "transactions",
    column: "recurring_rule_id",
    type: "column",
  },
  {
    table: "transactions",
    column: "recurring_occurrence_date",
    type: "column",
  },
];

function normalizeSupabaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

export function formatRequiredSchemaEntry(entry: RequiredSchemaEntry) {
  const schema = entry.schema ?? "public";

  if (entry.type === "table") {
    return `${schema}.${entry.table}`;
  }

  return `${schema}.${entry.table}.${entry.column}`;
}

function getSupabaseUrl(env: SchemaCheckEnv) {
  return env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL ?? "";
}

function getSupabaseReadKey(env: SchemaCheckEnv) {
  return env.SUPABASE_SERVICE_ROLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? env.E2E_SUPABASE_SERVICE_ROLE_KEY ?? "";
}

function buildRestUrl(baseUrl: string, entry: RequiredSchemaEntry) {
  const table = encodeURIComponent(entry.table);
  const select = entry.type === "table" ? "id" : entry.column;
  const params = new URLSearchParams({
    limit: "0",
    select,
  });

  return `${normalizeSupabaseUrl(baseUrl)}/rest/v1/${table}?${params.toString()}`;
}

function missingEnvResult(missing: string[], required: boolean): SchemaCheckResult {
  const message = `Production schema check ${required ? "failed" : "skipped"}: ${missing.join(" and ")} ${
    missing.length === 1 ? "is" : "are"
  } required.`;

  if (required) {
    return {
      status: "failed",
      missing,
      message,
    };
  }

  return {
    status: "skipped",
    message,
  };
}

export async function checkProductionSchema(args: {
  env?: SchemaCheckEnv;
  fetchImpl?: FetchLike;
  required?: boolean;
  requiredSchema?: RequiredSchemaEntry[];
} = {}): Promise<SchemaCheckResult> {
  const env = args.env ?? process.env;
  const required = args.required ?? false;
  const supabaseUrl = getSupabaseUrl(env);
  const supabaseReadKey = getSupabaseReadKey(env);
  const missingEnv = [
    supabaseUrl ? null : "NEXT_PUBLIC_SUPABASE_URL",
    supabaseReadKey ? null : "SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ].filter(Boolean) as string[];

  if (missingEnv.length) {
    return missingEnvResult(missingEnv, required);
  }

  const fetchImpl = args.fetchImpl ?? fetch;
  const requiredSchema = args.requiredSchema ?? REQUIRED_SCHEMA;
  const missing: string[] = [];
  const checked: string[] = [];

  for (const entry of requiredSchema) {
    const label = formatRequiredSchemaEntry(entry);
    let response: { ok: boolean; status: number };

    try {
      response = await fetchImpl(buildRestUrl(supabaseUrl, entry), {
        headers: {
          apikey: supabaseReadKey,
          Authorization: `Bearer ${supabaseReadKey}`,
          "Accept-Profile": entry.schema ?? "public",
        },
      });
    } catch {
      missing.push(label);
      continue;
    }

    if (!response.ok) {
      missing.push(label);
      continue;
    }

    checked.push(label);
  }

  if (missing.length) {
    return {
      status: "failed",
      missing,
      message: [
        "Production schema drift detected.",
        "",
        "Missing:",
        ...missing.map((item) => `- ${item}`),
        "",
        "Apply pending Supabase migrations before deploying app code.",
      ].join("\n"),
    };
  }

  return {
    status: "passed",
    checked,
    message: `Production schema check passed for ${checked.length} required object${checked.length === 1 ? "" : "s"}.`,
  };
}

async function main() {
  const required = process.argv.includes("--required");
  const result = await checkProductionSchema({ required });

  console.log(result.message);

  if (result.status === "failed") {
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(() => {
    console.error("Production schema check failed unexpectedly. Re-run with local diagnostics enabled.");
    process.exitCode = 1;
  });
}
