import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";

export type SupportMaintenanceSummary = {
  scanned_resolved: number;
  closed: number;
  scanned_closed: number;
  archived: number;
  errors: number;
};

const emptySummary: SupportMaintenanceSummary = {
  scanned_resolved: 0,
  closed: 0,
  scanned_closed: 0,
  archived: 0,
  errors: 0,
};

export async function runSupabaseSupportMaintenance(now = new Date()): Promise<SupportMaintenanceSummary> {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return { ...emptySummary, errors: 1 };
  }

  const resolvedCutoff = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString();
  const closedCutoff = resolvedCutoff;
  const summary = { ...emptySummary };

  const resolvedScan = await supabase
    .from("support_tickets")
    .select("id", { count: "exact", head: true })
    .eq("status", "resolved")
    .lte("resolved_at", resolvedCutoff);

  if (resolvedScan.error) {
    summary.errors += 1;
  } else {
    summary.scanned_resolved = resolvedScan.count ?? 0;
  }

  const closeResult = await supabase
    .from("support_tickets")
    .update({ status: "closed", closed_at: now.toISOString(), updated_at: now.toISOString() }, { count: "exact" })
    .eq("status", "resolved")
    .lte("resolved_at", resolvedCutoff);

  if (closeResult.error) {
    summary.errors += 1;
  } else {
    summary.closed = closeResult.count ?? 0;
  }

  const closedScan = await supabase
    .from("support_tickets")
    .select("id", { count: "exact", head: true })
    .eq("status", "closed")
    .lte("closed_at", closedCutoff);

  if (closedScan.error) {
    summary.errors += 1;
  } else {
    summary.scanned_closed = closedScan.count ?? 0;
  }

  const archiveResult = await supabase
    .from("support_tickets")
    .update({ status: "archived", archived_at: now.toISOString(), updated_at: now.toISOString() }, { count: "exact" })
    .eq("status", "closed")
    .lte("closed_at", closedCutoff);

  if (archiveResult.error) {
    summary.errors += 1;
  } else {
    summary.archived = archiveResult.count ?? 0;
  }

  return summary;
}
