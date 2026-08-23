// Emails a verified attendee their own personal learning list (spec backlog
// item, added post-launch-prep). Deliberately narrow: an attendee can only
// ever trigger this for *themselves* -- the function derives the attendee
// from the caller's JWT, never from a client-supplied id, so there's no way
// to email someone else's list.
//
// Requires two things set as Supabase Edge Function secrets (not committed
// here, and not something Claude ever handles/enters -- see README):
//   RESEND_API_KEY           -- same Resend account already used for OTP SMTP
//   LEARNING_LIST_FROM_EMAIL -- optional, defaults below if unset
//
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are injected
// automatically by the Supabase Edge Functions runtime -- nothing to set.

import { createClient } from "npm:@supabase/supabase-js@2";

const DEFAULT_FROM = "QUE Group Conference <noreply@quegroup.mikecarey.tech>";

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function renderEmailHtml(name: string | null, items: { title: string; notes: string | null; done: boolean }[]): string {
  const rows = items
    .map((it) => {
      const question = escapeHtml(it.title);
      const answer = it.notes ? escapeHtml(it.notes).replace(/\n/g, "<br/>") : null;
      return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;">
            <div style="font-weight:600;color:#15294d;font-size:15px;">${it.done ? "✓ " : ""}${question}</div>
            ${answer ? `<div style="color:#5b7fa6;margin-top:4px;font-size:14px;">${answer}</div>` : `<div style="color:#9fb3cc;margin-top:4px;font-size:13px;font-style:italic;">No notes yet</div>`}
          </td>
        </tr>`;
    })
    .join("");

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1f2933;">
      <h2 style="color:#15294d;margin-bottom:4px;">Your learning list</h2>
      <p style="color:#5b7fa6;margin-top:0;">2026 QUE Group Conference${name ? ` — hi ${escapeHtml(name)}` : ""}. Here's everything on your personal learning list, questions and notes included.</p>
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
      <p style="color:#9fb3cc;font-size:12px;margin-top:24px;">You're getting this because you tapped "Email me this list" in the QUE Group Conference app.</p>
    </div>`;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Verify your email first." }), { status: 401, headers: jsonHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Caller-scoped client: only used to confirm who's asking.
    const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Verify your email first." }), { status: 401, headers: jsonHeaders });
    }

    // Service-role client: fetches exactly one attendee's data, matched to
    // the just-verified caller -- never takes an id from the request body.
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: attendeeRow, error: attErr } = await admin
      .from("attendees")
      .select("id, name, email")
      .eq("auth_user_id", userData.user.id)
      .maybeSingle();
    if (attErr || !attendeeRow) {
      return new Response(JSON.stringify({ error: "Couldn't find your attendee profile." }), { status: 404, headers: jsonHeaders });
    }

    const { data: items, error: itemsErr } = await admin
      .from("learning_items")
      .select("title, notes, done")
      .eq("attendee_id", attendeeRow.id)
      .order("created_at", { ascending: true });
    if (itemsErr) {
      console.error("Failed to load learning items", itemsErr);
      return new Response(JSON.stringify({ error: "Couldn't load your learning list." }), { status: 500, headers: jsonHeaders });
    }
    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ error: "Your learning list is empty — add something first." }), { status: 400, headers: jsonHeaders });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.error("RESEND_API_KEY is not set");
      return new Response(JSON.stringify({ error: "Email isn't set up yet — ask the organizer to configure it." }), { status: 500, headers: jsonHeaders });
    }
    const fromEmail = Deno.env.get("LEARNING_LIST_FROM_EMAIL") ?? DEFAULT_FROM;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromEmail,
        to: attendeeRow.email,
        subject: "Your QUE 2026 learning list",
        html: renderEmailHtml(attendeeRow.name, items as { title: string; notes: string | null; done: boolean }[]),
      }),
    });

    if (!resendRes.ok) {
      const body = await resendRes.text();
      console.error("Resend API error", resendRes.status, body);
      return new Response(JSON.stringify({ error: "Failed to send the email. Try again in a bit." }), { status: 502, headers: jsonHeaders });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: jsonHeaders });
  } catch (err) {
    console.error("Unexpected error in send-learning-list-email", err);
    return new Response(JSON.stringify({ error: "Something went wrong. Try again in a bit." }), { status: 500, headers: jsonHeaders });
  }
});
