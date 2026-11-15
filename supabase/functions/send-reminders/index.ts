import { createClient } from "npm:@supabase/supabase-js@2.89.0";
import webpush from "npm:web-push@3.6.7";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {auth: {persistSession: false}});
const allowedHosts = new Set(["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com"]);
Deno.serve(async (req: Request) => {
  if (req.method !== "POST" || !req.headers.get("x-cron-secret")) return new Response("Unauthorized", {status: 401});
  const {data: config, error: configError} = await db.rpc("push_worker_config");
  if (configError || !config?.alusathi_push_cron || req.headers.get("x-cron-secret") !== config.alusathi_push_cron) return new Response("Unauthorized", {status: 401});
  const {data: key} = await db.from("push_public_config").select("public_key").single();
  if (!key) return new Response("Configuration unavailable", {status: 503});
  const {data: jobs, error} = await db.rpc("claim_due_reminders");
  if (error) return new Response("Queue unavailable", {status: 503});
  let accepted = 0, failed = 0;
  for (const job of jobs || []) {
    const {data: subscriptions} = await db.from("push_subscriptions").select("id,endpoint,p256dh,auth,language").eq("user_id", job.user_id).limit(10);
    let delivered = false;
    for (const sub of subscriptions || []) {
      try {
        const url = new URL(sub.endpoint);
        if (url.protocol !== "https:" || url.port || url.username || url.password || !allowedHosts.has(url.hostname)) throw new Error("Invalid push host");
        const payload = JSON.stringify({id: job.id, title: "আলুসাথী · AluSathi", body: sub.language === "bn" ? "জমির কাজের সময় হয়েছে। খাতা খুলে দেখুন।" : "It is time for a field task. Open your Khata."});
        const request = webpush.generateRequestDetails({endpoint: sub.endpoint, keys: {p256dh: sub.p256dh, auth: sub.auth}}, payload, {
          TTL: 3600, urgency: "normal", vapidDetails: {subject: Deno.env.get("SUPABASE_URL")!, publicKey: key.public_key, privateKey: config.alusathi_push_private},
        });
        const response = await fetch(request.endpoint, {method: request.method, headers: request.headers, body: request.body, redirect: "error", signal: AbortSignal.timeout(10000)});
        await response.body?.cancel();
        if (response.status === 404 || response.status === 410) await db.from("push_subscriptions").delete().eq("id", sub.id);
        else if (response.ok) delivered = true;
        else failed++;
      } catch { failed++; }
    }
    if (delivered) { await db.from("treatment_reminders").update({notified_at: new Date().toISOString()}).eq("id", job.id); accepted++; }
  }
  return Response.json({processed: jobs?.length || 0, accepted, failed});
});
