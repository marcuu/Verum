import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getWebPush } from "@/lib/notifications/webPush";
import { T_NOTIFICATION_SUBSCRIPTIONS } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const unauth = await requireAuth("POST");
  if (unauth) return unauth;

  const db = getSupabaseAdmin();

  const { data: subs, error } = await db
    .from(T_NOTIFICATION_SUBSCRIPTIONS)
    .select("*")
    .eq("enabled", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const webpush = getWebPush();
  let sent = 0;

  for (const sub of subs ?? []) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        JSON.stringify({
          title: "Verum",
          body: "Notifications are working.",
          url: "/",
          tag: "verum-test",
          type: "test",
        })
      );

      sent += 1;
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode;

      if (statusCode === 404 || statusCode === 410) {
        await db
          .from(T_NOTIFICATION_SUBSCRIPTIONS)
          .update({
            enabled: false,
            failure_count: (sub.failure_count ?? 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", sub.id);
      }
    }
  }

  return NextResponse.json({ ok: true, sent });
}
