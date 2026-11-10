import http2 from "node:http2";
import { sign } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// Push delivery for the EMS Examiner iPhone app (Kele, Nov 9 2026).
// Woken by the database (pg_net) whenever push_outbox gets rows, and every 5 minutes by pg_cron
// when something is still waiting. Claims pushes with push_claim_outbox, sends each to the
// examiner's registered iPhones through Apple Push Notification service (token auth, HTTP/2),
// records the result with push_complete_outbox, and drops tokens Apple reports as dead.
// Calling it has no other effect: it only works through the queue.
//
// Environment: APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID, APNS_PRIVATE_KEY (the .p8 file's text;
// "\n" sequences are accepted), plus the usual NEXT_PUBLIC_SUPABASE_URL and service key.

type Device = { token: string; environment: "sandbox" | "production" };
type Push = {
  id: string;
  event: string;
  category: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  attempts: number;
  devices: Device[];
};

const HOSTS: Record<Device["environment"], string> = {
  production: "https://api.push.apple.com",
  sandbox: "https://api.sandbox.push.apple.com",
};

let cachedJwt: { token: string; issuedAt: number } | null = null;

function base64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

/** Apple provider token (ES256), reused for 50 minutes (Apple accepts 20–60). */
function providerToken(keyId: string, teamId: string, privateKey: string, fresh = false) {
  const now = Math.floor(Date.now() / 1000);
  if (!fresh && cachedJwt && now - cachedJwt.issuedAt < 50 * 60) return cachedJwt.token;
  const header = base64url(JSON.stringify({ alg: "ES256", kid: keyId }));
  const claims = base64url(JSON.stringify({ iss: teamId, iat: now }));
  const signature = sign("sha256", Buffer.from(`${header}.${claims}`), { key: privateKey, dsaEncoding: "ieee-p1363" });
  cachedJwt = { token: `${header}.${claims}.${base64url(signature)}`, issuedAt: now };
  return cachedJwt.token;
}

function apnsPayload(push: Push) {
  const data = push.data ?? {};
  return JSON.stringify({
    aps: {
      alert: { title: push.title, body: push.body },
      sound: "default",
      category: push.category,
      "thread-id": typeof data.request_id === "string" ? data.request_id : push.event,
    },
    event: push.event,
    ...data,
  });
}

function send(session: http2.ClientHttp2Session, path: string, headers: Record<string, string>, body: string) {
  return new Promise<{ status: number; reason: string }>((resolve) => {
    const stream = session.request({ ":method": "POST", ":path": path, ...headers });
    let status = 0;
    let text = "";
    stream.setEncoding("utf8");
    stream.on("response", (h) => {
      status = Number(h[":status"] ?? 0);
    });
    stream.on("data", (chunk) => {
      text += chunk;
    });
    stream.on("end", () => {
      let reason = "";
      try {
        reason = text ? (JSON.parse(text).reason as string) ?? "" : "";
      } catch {
        reason = text.slice(0, 120);
      }
      resolve({ status, reason });
    });
    stream.on("error", (error) => resolve({ status: 0, reason: error.message }));
    stream.setTimeout(8000, () => {
      stream.close();
      resolve({ status: 0, reason: "Timed out" });
    });
    stream.end(body);
  });
}

export default async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const bundleId = process.env.APNS_BUNDLE_ID;
  const privateKey = process.env.APNS_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!supabaseUrl || !serviceKey || !keyId || !teamId || !bundleId || !privateKey) {
    // Leave the queue untouched until push is configured.
    return Response.json({ ok: false, error: "Push is not configured." }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.rpc("push_claim_outbox", { p_limit: 50 });
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  const pushes = (data ?? []) as Push[];
  const sessions = new Map<string, http2.ClientHttp2Session>();
  const sessionFor = (environment: Device["environment"]) => {
    const host = HOSTS[environment] ?? HOSTS.production;
    let session = sessions.get(host);
    if (!session || session.closed || session.destroyed) {
      session = http2.connect(host);
      session.on("error", () => undefined);
      sessions.set(host, session);
    }
    return session;
  };

  let delivered = 0;
  try {
    for (const push of pushes) {
      let sent = 0;
      const errors: string[] = [];
      const body = apnsPayload(push);

      for (const device of push.devices ?? []) {
        const headers = (fresh: boolean) => ({
          authorization: `bearer ${providerToken(keyId, teamId, privateKey, fresh)}`,
          "apns-topic": bundleId,
          "apns-push-type": "alert",
          "apns-priority": "10",
          "content-type": "application/json",
        });
        let result = await send(sessionFor(device.environment), `/3/device/${device.token}`, headers(false), body);
        if (result.status === 403 && result.reason === "ExpiredProviderToken") {
          result = await send(sessionFor(device.environment), `/3/device/${device.token}`, headers(true), body);
        }

        if (result.status === 200) {
          sent += 1;
        } else if (result.status === 410 || ["BadDeviceToken", "Unregistered"].includes(result.reason)) {
          // The phone no longer accepts pushes (app deleted or token reset). The app registers a
          // new token on its next launch. (DeviceTokenNotForTopic is a bundle ID setup error and
          // is only reported, so a typo in APNS_BUNDLE_ID can't wipe every phone.)
          await supabase.rpc("push_remove_device", { p_token: device.token });
          errors.push(result.reason || `HTTP ${result.status}`);
        } else {
          errors.push(result.reason || `HTTP ${result.status}`);
        }
      }

      await supabase.rpc("push_complete_outbox", {
        p_id: push.id,
        p_sent: sent,
        p_error: errors.length ? errors.join("; ").slice(0, 500) : null,
      });
      delivered += sent;
    }
  } finally {
    for (const session of sessions.values()) session.close();
  }

  return Response.json({ ok: true, claimed: pushes.length, delivered });
};
