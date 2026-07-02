// Same-origin fetch wrapper. The auth cookie is httpOnly and sent automatically.
export async function api<T = unknown>(
  path: string,
  opts: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    ...(opts.headers as Record<string, string>),
  };
  if (opts.body != null) headers["Content-Type"] = "application/json";

  const res = await fetch(`/api${path}`, {
    ...opts,
    headers,
    credentials: "same-origin",
  });

  if (res.status === 401) {
    // Cookie missing/invalid — bounce to login.
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("unauthorized");
  }
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      msg += ` — ${await res.text()}`;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  const ct = res.headers.get("content-type") || "";
  return (ct.includes("application/json")
    ? await res.json()
    : await res.text()) as T;
}

// ---- date helpers (client) ----
// The day an entry belongs to is the day the owner lived: the device's local
// calendar date. (Previously UTC, which pushed late-evening entries onto
// tomorrow's date during BST.)
function localISO(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): string {
  return localISO(new Date());
}

export function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1); // local-date rollover, DST-safe
  return localISO(d);
}
