import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getWebPush } from "@/lib/notifications/webPush";
import { isWithinWindow, localParts } from "@/lib/notifications/schedule";
import {
  T_ENTRIES,
  T_NOTIFICATION_DELIVERIES,
  T_NOTIFICATION_PREFERENCES,
  T_NOTIFICATION_SUBSCRIPTIONS,
} from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Vercel cron sends `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is
// set. We also accept `?secret=` as a fallback for external schedulers.
function assertCron(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const auth = req.headers.get("authorization");
  const querySecret = req.nextUrl.searchParams.get("secret");

  if (auth === `Bearer ${secret}` || querySecret === secret) {
    return null;
  }

  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function GET(req: NextRequest) {
  const unauth = assertCron(req);
  if (unauth) return unauth;

  const db = getSupabaseAdmin();
  const webpush = getWebPush();

  const { data: prefs, error: prefsError } = await db
    .from(T_NOTIFICATION_PREFERENCES)
    .select("*")
    .eq("id", true)
    .single();

  if (prefsError) {
    return NextResponse.json({ error: prefsError.message }, { status: 500 });
  }

  const timezone = prefs.timezone || "Europe/London";
  const local = localParts(timezone);

  // Wide window (75 min grace before, 60 min after) so a single once-daily
  // Vercel Hobby cron pinned to a fixed UTC time still fires across the BST/GMT
  // shift. See lib/notifications/schedule.ts for the rationale.
  const dueDaily =
    prefs.daily_enabled && isWithinWindow(local.hhmm, prefs.daily_time, 60, 75);

  if (!dueDaily) {
    return NextResponse.json({
      ok: true,
      sent: 0,
      reason: "nothing_due",
      local,
    });
  }

  // The journal stores days in UTC; at the evening reminder hour Europe/London
  // is UTC or UTC+1, so the local day matches the stored day.
  const { data: existingEntry, error: entryError } = await db
    .from(T_ENTRIES)
    .select("day")
    .eq("day", local.isoDay)
    .maybeSingle();

  if (entryError) {
    return NextResponse.json({ error: entryError.message }, { status: 500 });
  }

  if (existingEntry) {
    return NextResponse.json({
      ok: true,
      sent: 0,
      reason: "already_logged",
      local,
    });
  }

  const { data: subs, error: subsError } = await db
    .from(T_NOTIFICATION_SUBSCRIPTIONS)
    .select("*")
    .eq("enabled", true);

  if (subsError) {
    return NextResponse.json({ error: subsError.message }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const sub of subs ?? []) {
    const { data: existingDelivery, error: deliveryCheckError } = await db
      .from(T_NOTIFICATION_DELIVERIES)
      .select("id")
      .eq("subscription_id", sub.id)
      .eq("notification_type", "daily_reminder")
      .eq("logical_day", local.isoDay)
      .maybeSingle();

    if (deliveryCheckError) {
      failed += 1;
      continue;
    }

    if (existingDelivery) {
      skipped += 1;
      continue;
    }

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
          body: "What happened today?",
          url: "/",
          tag: `verum-daily-${local.isoDay}`,
          type: "daily_reminder",
        })
      );

      await db.from(T_NOTIFICATION_DELIVERIES).insert({
        subscription_id: sub.id,
        notification_type: "daily_reminder",
        logical_day: local.isoDay,
        payload: { timezone },
        status: "sent",
      });

      sent += 1;
    } catch (err: unknown) {
      failed += 1;

      const statusCode = (err as { statusCode?: number })?.statusCode;
      const message = (err as { message?: string })?.message ?? String(err);

      await db.from(T_NOTIFICATION_DELIVERIES).insert({
        subscription_id: sub.id,
        notification_type: "daily_reminder",
        logical_day: local.isoDay,
        payload: { timezone },
        status: "failed",
        error: message,
      });

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

  return NextResponse.json({
    ok: true,
    sent,
    skipped,
    failed,
    local,
  });
}
