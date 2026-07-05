"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import {
  getCurrentSubscription,
  isNotificationSupported,
  subscribeToPush,
} from "@/lib/notifications/client";

type Preferences = {
  timezone: string;
  daily_enabled: boolean;
  rescue_enabled: boolean;
  rescue_min_streak: number;
  weekly_enabled: boolean;
  weekly_day: number;
  backup_enabled: boolean;
  backup_day_of_month: number;
};

// Delivery times are fixed by the once-daily crons in vercel.json (UTC),
// shown here in UK local time. They are facts to display, not settings to
// edit — a time picker wired to nothing is worse than no picker.
const DELIVERY_TIMES = {
  daily: "18:30",
  rescue: "20:00",
  weekly: "16:00",
  backup: "08:00",
} as const;

type Delivery = {
  id: string;
  created_at: string;
  notification_type: string;
  status: "sent" | "skipped" | "failed";
  error: string | null;
};

const TYPE_LABELS: Record<string, string> = {
  daily_reminder: "Daily reminder",
  streak_rescue: "Streak rescue",
  weekly_reflection: "Weekly reflection",
  monthly_backup: "Monthly backup",
  system_alert: "System alert",
  test: "Test",
};

function deliveryLabel(type: string): string {
  return TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}

function deliveryWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function NotificationSettings() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<
    NotificationPermission | "unknown"
  >("unknown");
  const [subscribed, setSubscribed] = useState(false);
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const advancedInitialized = useRef(false);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);

  async function refresh() {
    const ok = isNotificationSupported();
    setSupported(ok);

    if (ok) {
      setPermission(Notification.permission);
      const sub = await getCurrentSubscription().catch(() => null);
      setSubscribed(!!sub);
    }

    const p = await api<Preferences>("/notifications/preferences").catch(
      () => null
    );
    setPrefs(p);

    // Delivery history is a quiet extra; failing to load it is silent.
    const d = await api<Delivery[]>("/notifications/deliveries").catch(
      () => []
    );
    setDeliveries(d);
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!prefs) return;
    if (advancedInitialized.current) return;
    advancedInitialized.current = true;
    if (prefs.rescue_enabled || prefs.weekly_enabled || prefs.backup_enabled) {
      setAdvancedOpen(true);
    }
  }, [prefs]);

  async function enable() {
    setBusy(true);
    setMessage(null);

    try {
      const sub = await subscribeToPush();
      await api("/notifications/subscribe", {
        method: "POST",
        body: JSON.stringify(sub),
      });
      setMessage("Reminders enabled on this device.");
      await refresh();
    } catch (error: unknown) {
      setMessage(
        (error as Error)?.message ?? "Could not enable reminders."
      );
    } finally {
      setBusy(false);
    }
  }

  async function disableDevice() {
    setBusy(true);
    setMessage(null);

    try {
      const sub = await getCurrentSubscription();
      if (sub) {
        await api("/notifications/unsubscribe", {
          method: "POST",
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }

      setMessage("Reminders disabled on this device.");
      await refresh();
    } catch (error: unknown) {
      setMessage(
        (error as Error)?.message ?? "Could not disable reminders."
      );
    } finally {
      setBusy(false);
    }
  }

  async function savePrefs(patch: Partial<Preferences>) {
    if (!prefs) return;

    const next = { ...prefs, ...patch };
    setPrefs(next);

    try {
      const saved = await api<Preferences>("/notifications/preferences", {
        method: "PUT",
        body: JSON.stringify(patch),
      });
      setPrefs(saved);
    } catch {
      setMessage("Could not save reminder preferences.");
      await refresh();
    }
  }

  async function sendTest() {
    setBusy(true);
    setMessage(null);

    try {
      const result = await api<{ ok: boolean; sent: number }>(
        "/notifications/test",
        { method: "POST" }
      );
      setMessage(
        `Sent ${result.sent} test notification${
          result.sent === 1 ? "" : "s"
        }.`
      );
    } catch {
      setMessage("Could not send test notification.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="notifications" aria-label="Reminders">
      <p className="overline">Reminders</p>
      <p className="empty">
        Verum can quietly remind you to keep the record alive. Keep these
        sparse.
      </p>

      <p className="empty">
        On iPhone, install Verum to your Home Screen first: Share &rarr; Add to
        Home Screen. Then open Verum from the Home Screen and enable reminders.
      </p>

      {!supported && (
        <p className="empty">
          Notifications are not supported on this browser.
        </p>
      )}

      {supported && permission === "denied" && (
        <p className="empty">
          Notifications are blocked. Re-enable them in your browser or system
          settings.
        </p>
      )}

      {supported && permission !== "denied" && (
        <div className="notification-controls">
          <div className="notification-primary">
            {!subscribed ? (
              <button type="button" onClick={enable} disabled={busy}>
                Enable reminders
              </button>
            ) : (
              <button type="button" onClick={disableDevice} disabled={busy}>
                Disable on this device
              </button>
            )}

            <button
              type="button"
              onClick={sendTest}
              disabled={busy || !subscribed}
            >
              Send test
            </button>
          </div>

          {prefs && (
            <>
              {/* Daily reminder */}
              <div className="notification-group">
                <label className="notification-row">
                  <input
                    type="checkbox"
                    checked={prefs.daily_enabled}
                    onChange={(e) =>
                      savePrefs({ daily_enabled: e.target.checked })
                    }
                  />
                  Daily reminder
                </label>
                <p className="empty">
                  A gentle prompt if you have not written today. Delivered
                  around {DELIVERY_TIMES.daily}.
                </p>
              </div>

              <details
                className="notification-advanced"
                onToggle={(e) =>
                  setAdvancedOpen(e.currentTarget.open)
                }
                open={advancedOpen}
              >
                <summary>Advanced</summary>
                <div className="notification-advanced-panel">
                  {/* Streak rescue */}
                  <div className="notification-group">
                    <label className="notification-row">
                      <input
                        type="checkbox"
                        checked={prefs.rescue_enabled}
                        onChange={(e) =>
                          savePrefs({ rescue_enabled: e.target.checked })
                        }
                      />
                      Streak rescue
                    </label>
                    <p className="empty">
                      A late nudge if an active streak is about to break.
                      Delivered around {DELIVERY_TIMES.rescue}.
                    </p>
                    <div className="notification-row">
                      <label className="notification-row">
                        Min streak
                        <input
                          type="number"
                          min={2}
                          max={365}
                          aria-label="Minimum streak"
                          value={prefs.rescue_min_streak}
                          onChange={(e) =>
                            savePrefs({
                              rescue_min_streak: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                    </div>
                  </div>

                  {/* Weekly reflection */}
                  <div className="notification-group">
                    <label className="notification-row">
                      <input
                        type="checkbox"
                        checked={prefs.weekly_enabled}
                        onChange={(e) =>
                          savePrefs({ weekly_enabled: e.target.checked })
                        }
                      />
                      Weekly reflection
                    </label>
                    <p className="empty">
                      A once-a-week prompt to review the record. Delivered
                      around {DELIVERY_TIMES.weekly}.
                    </p>
                    <div className="notification-row">
                      <select
                        aria-label="Weekly reflection day"
                        value={prefs.weekly_day}
                        onChange={(e) =>
                          savePrefs({ weekly_day: Number(e.target.value) })
                        }
                      >
                        <option value={0}>Sunday</option>
                        <option value={1}>Monday</option>
                        <option value={2}>Tuesday</option>
                        <option value={3}>Wednesday</option>
                        <option value={4}>Thursday</option>
                        <option value={5}>Friday</option>
                        <option value={6}>Saturday</option>
                      </select>
                    </div>
                  </div>

                  {/* Monthly backup */}
                  <div className="notification-group">
                    <label className="notification-row">
                      <input
                        type="checkbox"
                        checked={prefs.backup_enabled}
                        onChange={(e) =>
                          savePrefs({ backup_enabled: e.target.checked })
                        }
                      />
                      Monthly backup
                    </label>
                    <p className="empty">
                      A quiet reminder to export your journal. Delivered
                      around {DELIVERY_TIMES.backup}.
                    </p>
                    <div className="notification-row">
                      <label className="notification-row">
                        Day
                        <input
                          type="number"
                          min={1}
                          max={28}
                          aria-label="Backup day of month"
                          value={prefs.backup_day_of_month}
                          onChange={(e) =>
                            savePrefs({
                              backup_day_of_month: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </details>

              {/* Delivery health: a silently-dead reminder looks identical to
                  a quiet week unless failures are visible here. */}
              {deliveries[0]?.status === "failed" && (
                <p className="delivery-warning" role="status">
                  The last reminder didn&rsquo;t arrive
                  {deliveries[0].error ? ` — ${deliveries[0].error}` : ""}. If
                  this keeps happening, disable and re-enable reminders on
                  this device.
                </p>
              )}

              {deliveries.length > 0 && (
                <details className="notification-advanced">
                  <summary>Delivery history</summary>
                  <ul className="delivery-list">
                    {deliveries.map((d) => (
                      <li key={d.id} className="delivery-row">
                        <span
                          className={`delivery-dot delivery-dot--${d.status}`}
                          aria-hidden="true"
                        />
                        <span className="delivery-when">
                          {deliveryWhen(d.created_at)}
                        </span>
                        <span className="delivery-type">
                          {deliveryLabel(d.notification_type)}
                        </span>
                        <span className="delivery-status">
                          {d.status === "failed" && d.error
                            ? `failed — ${d.error}`
                            : d.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              <p className="empty">
                Reminder times are approximate on this plan &mdash; they can
                shift about an hour with daylight saving.
              </p>
            </>
          )}
        </div>
      )}

      {message && <p className="empty">{message}</p>}
    </section>
  );
}
