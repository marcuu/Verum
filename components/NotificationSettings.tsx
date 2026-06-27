"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import {
  getCurrentSubscription,
  isNotificationSupported,
  subscribeToPush,
} from "@/lib/notifications/client";

type Preferences = {
  timezone: string;
  daily_enabled: boolean;
  daily_time: string;
  rescue_enabled: boolean;
  rescue_time: string;
  rescue_min_streak: number;
  weekly_enabled: boolean;
  weekly_day: number;
  weekly_time: string;
  backup_enabled: boolean;
  backup_day_of_month: number;
  backup_time: string;
};

export default function NotificationSettings() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<
    NotificationPermission | "unknown"
  >("unknown");
  const [subscribed, setSubscribed] = useState(false);
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
  }

  useEffect(() => {
    refresh();
  }, []);

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
          {!subscribed ? (
            <button type="button" onClick={enable} disabled={busy}>
              Enable reminders
            </button>
          ) : (
            <button type="button" onClick={disableDevice} disabled={busy}>
              Disable on this device
            </button>
          )}

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
                  A gentle prompt if you have not written today.
                </p>
                <input
                  type="time"
                  aria-label="Daily reminder time"
                  value={prefs.daily_time.slice(0, 5)}
                  onChange={(e) => savePrefs({ daily_time: e.target.value })}
                />
              </div>

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
                </p>
                <div className="notification-row">
                  <input
                    type="time"
                    aria-label="Streak rescue time"
                    value={prefs.rescue_time.slice(0, 5)}
                    onChange={(e) => savePrefs({ rescue_time: e.target.value })}
                  />
                  <label className="notification-row">
                    Min streak
                    <input
                      type="number"
                      min={2}
                      max={365}
                      aria-label="Minimum streak"
                      value={prefs.rescue_min_streak}
                      onChange={(e) =>
                        savePrefs({ rescue_min_streak: Number(e.target.value) })
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
                  A once-a-week prompt to review the record.
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
                  <input
                    type="time"
                    aria-label="Weekly reflection time"
                    value={prefs.weekly_time.slice(0, 5)}
                    onChange={(e) => savePrefs({ weekly_time: e.target.value })}
                  />
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
                  A quiet reminder to export your journal.
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
                  <input
                    type="time"
                    aria-label="Monthly backup time"
                    value={prefs.backup_time.slice(0, 5)}
                    onChange={(e) => savePrefs({ backup_time: e.target.value })}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={sendTest}
                disabled={busy || !subscribed}
              >
                Send test
              </button>

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
