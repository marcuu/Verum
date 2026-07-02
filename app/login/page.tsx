"use client";

import { Suspense, useState } from "react";
import MoonPhaseIcon from "@/components/MoonPhaseIcon";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  // Only follow same-origin paths — an absolute or protocol-relative URL here
  // would let a crafted login link bounce the user to an attacker page.
  const rawNext = params.get("next") || "/";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.includes("\\")
      ? rawNext
      : "/";

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
        setError(
          res.status === 429
            ? "Too many attempts. Wait a few minutes and try again."
            : "Invalid token. Try again."
        );
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
      {/* The cover of the book: mark, title, one italic line. */}
      <div className="login-cover">
        <MoonPhaseIcon />
        <h1>Verum</h1>
        <p className="login-tag">
          An honest daily record, set against the weeks you have left.
        </p>
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
