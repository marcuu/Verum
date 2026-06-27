// Same-origin fetch wrapper. The auth cookie is httpOnly and sent automatically.
export async function api<T = unknown>(
  path: string,
  opts: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    ...(opts.headers as Record<string, string>),
  };
  if (opts.method === "POST") headers["Content-Type"] = "application/json";

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

// ---- UTC date helpers (client) ----
export function todayISOUTC(): string {
  return new Date().toISOString().slice(0, 10);
}
