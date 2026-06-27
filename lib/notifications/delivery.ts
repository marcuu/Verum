import { getSupabaseAdmin } from "@/lib/supabase";
import { getWebPush } from "@/lib/notifications/webPush";
import {
  T_NOTIFICATION_DELIVERIES,
  T_NOTIFICATION_SUBSCRIPTIONS,
} from "@/lib/constants";
import type { NotificationType, PushPayload, SubscriptionRow } from "./types";

type LogicalKeys = {
  logicalDay?: string;
  logicalWeek?: string;
  logicalMonth?: string;
};

type SendOptions = LogicalKeys & {
  subscription: SubscriptionRow;
  notificationType: NotificationType;
  payload: PushPayload;
  meta?: Record<string, unknown>;
};

export type DeliveryStatus = "sent" | "skipped" | "failed";

// True when a delivery for this subscription/type already exists for the given
// logical period — the duplicate-suppression guard for every notification type.
export async function deliveryExists(
  options: { subscriptionId: string; notificationType: NotificationType } & LogicalKeys
): Promise<boolean> {
  const db = getSupabaseAdmin();

  let query = db
    .from(T_NOTIFICATION_DELIVERIES)
    .select("id")
    .eq("subscription_id", options.subscriptionId)
    .eq("notification_type", options.notificationType);

  if (options.logicalDay) query = query.eq("logical_day", options.logicalDay);
  if (options.logicalWeek) query = query.eq("logical_week", options.logicalWeek);
  if (options.logicalMonth)
    query = query.eq("logical_month", options.logicalMonth);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;

  return !!data;
}

// Sends a push notification, logging the attempt and suppressing duplicates.
// Disables subscriptions the push service reports as gone (404/410).
export async function sendLoggedNotification(
  options: SendOptions
): Promise<{ status: DeliveryStatus; error?: string }> {
  const db = getSupabaseAdmin();

  const alreadySent = await deliveryExists({
    subscriptionId: options.subscription.id,
    notificationType: options.notificationType,
    logicalDay: options.logicalDay,
    logicalWeek: options.logicalWeek,
    logicalMonth: options.logicalMonth,
  });

  if (alreadySent) {
    return { status: "skipped" };
  }

  const deliveryRow = {
    subscription_id: options.subscription.id,
    notification_type: options.notificationType,
    logical_day: options.logicalDay ?? null,
    logical_week: options.logicalWeek ?? null,
    logical_month: options.logicalMonth ?? null,
    payload: options.meta ?? {},
  };

  try {
    const webpush = getWebPush();

    await webpush.sendNotification(
      {
        endpoint: options.subscription.endpoint,
        keys: {
          p256dh: options.subscription.p256dh,
          auth: options.subscription.auth,
        },
      },
      JSON.stringify(options.payload)
    );

    await db
      .from(T_NOTIFICATION_DELIVERIES)
      .insert({ ...deliveryRow, status: "sent" });

    return { status: "sent" };
  } catch (err: unknown) {
    const message = (err as { message?: string })?.message ?? String(err);
    const statusCode = (err as { statusCode?: number })?.statusCode;

    await db
      .from(T_NOTIFICATION_DELIVERIES)
      .insert({ ...deliveryRow, status: "failed", error: message });

    if (statusCode === 404 || statusCode === 410) {
      await db
        .from(T_NOTIFICATION_SUBSCRIPTIONS)
        .update({
          enabled: false,
          failure_count: (options.subscription.failure_count ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", options.subscription.id);
    }

    return { status: "failed", error: message };
  }
}
