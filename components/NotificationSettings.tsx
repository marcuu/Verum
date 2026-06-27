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
        Verum can remind you once a day if you haven&rsquo;t written yet.
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

              <input
                type="time"
                aria-label="Daily reminder time"
                value={prefs.daily_time.slice(0, 5)}
                onChange={(e) => savePrefs({ daily_time: e.target.value })}
              />

              <button
                type="button"
                onClick={sendTest}
                disabled={busy || !subscribed}
              >
                Send test
              </button>
            </>
          )}
        </div>
      )}

      {message && <p className="empty">{message}</p>}
    </section>
  );
}
