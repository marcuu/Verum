"use client";

import { Suspense, useState } from "react";
import MoonPhaseIcon from "@/components/MoonPhaseIcon";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        setError("Invalid token. Try again.");
        setBusy(false);
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
      setBusy(false);
    }
  }

  return (
    <main className="login">
      <div className="brand">
        <MoonPhaseIcon />
        <div>
          <h1>Verum</h1>
          <div className="sub">daily journal</div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="login-form">
        <input
          type="password"
          placeholder="Access token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          autoFocus
          autoComplete="current-password"
        />
        <button type="submit" disabled={busy || !token}>
          {busy ? "Checking…" : "Enter"}
        </button>
      </form>
      {error && <p className="login-error">{error}</p>}
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
