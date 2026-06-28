// Keep post-login navigation inside this app. Middleware writes a relative path
// here, but users can still hand-edit /login?next=... in the address bar.
export function safeNextPath(value: string | null | undefined): string {
  if (!value) return "/";

  try {
    const decoded = decodeURIComponent(value.trim());
    if (!decoded.startsWith("/") || decoded.startsWith("//")) return "/";
    if (decoded.startsWith("/\\")) return "/";
    return decoded;
  } catch {
    return "/";
  }
}
