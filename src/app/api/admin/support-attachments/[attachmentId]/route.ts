import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseSupportService } from "@/domain/support/service";
import { requireAuthenticatedSession } from "@/lib/auth/guards";
import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPPORT_ATTACHMENT_BUCKET = "support-attachments";

type RouteContext = {
  params: Promise<{ attachmentId: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await requireAuthenticatedSession();

  if (!auth.user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const service = await createSupabaseSupportService();
  const isAdmin = await service.isAdmin(auth.user.id);

  if (!isAdmin) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  try {
    const { attachmentId } = await context.params;
    const attachment = await service.getAttachment(attachmentId);
    const supabase = createSupabaseAdminClient();

    if (!supabase) {
      return NextResponse.json({ ok: false }, { status: 503 });
    }

    const { data, error } = await supabase.storage
      .from(SUPPORT_ATTACHMENT_BUCKET)
      .createSignedUrl(attachment.storagePath, 60);

    if (error || !data?.signedUrl) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    return NextResponse.redirect(data.signedUrl);
  } catch {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
}
