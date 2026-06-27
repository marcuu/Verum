import webpush from "web-push";

// Server-only. Configures VAPID details once per process. Never import this
// from a client component — it relies on the private key.
let configured = false;

export function getWebPush() {
  if (!configured) {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
    const subject = process.env.WEB_PUSH_SUBJECT;

    if (!publicKey || !privateKey || !subject) {
      throw new Error("Missing Web Push environment variables.");
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  }

  return webpush;
}
