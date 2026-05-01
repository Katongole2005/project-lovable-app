import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FALLBACK_ADMIN_EMAIL = "shelvinjoe11@gmail.com";
const USERS_PER_PAGE = 1000;
const MAX_SEND_LIMIT = 1000;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char] || char));
}

function buildMetadataName(metadata: Record<string, any> | null | undefined): string {
  const firstName = String(metadata?.first_name || "").trim();
  const lastName = String(metadata?.last_name || "").trim();
  return String(
    metadata?.full_name ||
    metadata?.name ||
    [firstName, lastName].filter(Boolean).join(" ") ||
    ""
  ).trim();
}

function buildMarketingHtml(message: string, previewText: string, ctaLabel: string, ctaUrl: string): string {
  const paragraphs = message
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MovieBay</title>
  <style>
    body { margin: 0; padding: 0; background: #09090b; color: #f4f4f5; font-family: Arial, sans-serif; }
    .wrapper { max-width: 620px; margin: 0 auto; padding: 36px 20px; }
    .card { background: #111113; border: 1px solid #27272a; border-radius: 18px; padding: 32px; }
    .logo { font-size: 22px; font-weight: 800; letter-spacing: -0.03em; color: #fff; margin-bottom: 24px; }
    .preview { display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent; }
    p { color: #d4d4d8; font-size: 15px; line-height: 1.7; margin: 0 0 16px; }
    .btn { display: inline-block; margin-top: 12px; padding: 13px 22px; border-radius: 999px; background: #fff; color: #09090b; text-decoration: none; font-weight: 700; }
    .footer { color: #71717a; font-size: 12px; margin-top: 24px; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="preview">${escapeHtml(previewText)}</div>
  <div class="wrapper">
    <div class="card">
      <div class="logo">MovieBay</div>
      ${paragraphs}
      <a class="btn" href="${escapeHtml(ctaUrl)}">${escapeHtml(ctaLabel)}</a>
      <div class="footer">You are receiving this because you created a MovieBay account.</div>
    </div>
  </div>
</body>
</html>`;
}

function toBase64(value: string): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(value)));
}

function encodeHeader(value: string): string {
  return /^[\x00-\x7F]*$/.test(value) ? value.replace(/[\r\n]+/g, " ") : `=?UTF-8?B?${toBase64(value)}?=`;
}

function escapeAddressName(value: string): string {
  return value.replace(/["\r\n]/g, "");
}

async function readSmtpResponse(conn: Deno.Conn): Promise<{ code: number; text: string }> {
  const decoder = new TextDecoder();
  const buffer = new Uint8Array(4096);
  let text = "";

  while (true) {
    const count = await conn.read(buffer);
    if (count === null) throw new Error("SMTP connection closed unexpectedly");
    text += decoder.decode(buffer.subarray(0, count), { stream: true });

    const lines = text.split(/\r?\n/).filter(Boolean);
    const lastLine = lines[lines.length - 1] || "";
    const match = lastLine.match(/^(\d{3})\s/);
    if (match) {
      return { code: Number(match[1]), text: text.trim() };
    }
  }
}

async function writeSmtpCommand(conn: Deno.Conn, command: string) {
  await conn.write(new TextEncoder().encode(`${command}\r\n`));
}

function assertSmtp(response: { code: number; text: string }, expected: number[], action: string) {
  if (!expected.includes(response.code)) {
    throw new Error(`${action} failed: ${response.text}`);
  }
}

function buildRawEmail(fromEmail: string, toEmail: string, subject: string, html: string) {
  const safeSubject = encodeHeader(subject);
  const safeFromName = escapeAddressName("MovieBay");
  const safeTo = toEmail.replace(/[\r\n<>]/g, "");
  const safeFrom = fromEmail.replace(/[\r\n<>]/g, "");
  const body = html.replace(/^\./gm, "..");

  return [
    `From: "${safeFromName}" <${safeFrom}>`,
    `To: <${safeTo}>`,
    `Subject: ${safeSubject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    body,
  ].join("\r\n");
}

async function connectSmtp(hostname: string, port: number, username: string, password: string) {
  const conn = await Deno.connectTls({ hostname, port });
  assertSmtp(await readSmtpResponse(conn), [220], "SMTP greeting");

  await writeSmtpCommand(conn, "EHLO www.s-u.in");
  assertSmtp(await readSmtpResponse(conn), [250], "SMTP EHLO");

  await writeSmtpCommand(conn, "AUTH LOGIN");
  assertSmtp(await readSmtpResponse(conn), [334], "SMTP auth username prompt");

  await writeSmtpCommand(conn, toBase64(username));
  assertSmtp(await readSmtpResponse(conn), [334], "SMTP auth password prompt");

  await writeSmtpCommand(conn, toBase64(password));
  assertSmtp(await readSmtpResponse(conn), [235], "SMTP auth");

  return conn;
}

async function sendSmtpMail(conn: Deno.Conn, fromEmail: string, toEmail: string, subject: string, html: string) {
  await writeSmtpCommand(conn, `MAIL FROM:<${fromEmail}>`);
  assertSmtp(await readSmtpResponse(conn), [250], "SMTP MAIL FROM");

  await writeSmtpCommand(conn, `RCPT TO:<${toEmail}>`);
  assertSmtp(await readSmtpResponse(conn), [250, 251], "SMTP RCPT TO");

  await writeSmtpCommand(conn, "DATA");
  assertSmtp(await readSmtpResponse(conn), [354], "SMTP DATA");

  await conn.write(new TextEncoder().encode(`${buildRawEmail(fromEmail, toEmail, subject, html)}\r\n.\r\n`));
  assertSmtp(await readSmtpResponse(conn), [250], "SMTP message send");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      subject,
      message,
      target = "inactive",
      inactiveDays = 30,
      limit = 200,
      dryRun = false,
      ctaLabel = "Open MovieBay",
      ctaUrl = "https://www.s-u.in",
      previewText = "New movies are waiting for you on MovieBay.",
    } = await req.json();

    if (!subject || !message) {
      return new Response(JSON.stringify({ error: "Subject and message are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sendLimit = Math.max(1, Math.min(Number(limit) || 200, MAX_SEND_LIMIT));
    const days = Math.max(1, Number(inactiveDays) || 30);
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await userClient.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = claimsData.user.id;
    const callerEmail = claimsData.user.email?.toLowerCase();
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData && callerEmail !== FALLBACK_ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allUsers: any[] = [];
    let page = 1;
    while (true) {
      const { data: usersData, error: usersError } = await adminClient.auth.admin.listUsers({
        page,
        perPage: USERS_PER_PAGE,
      });
      if (usersError) throw usersError;

      const batch = usersData?.users || [];
      allUsers.push(...batch);
      if (batch.length < USERS_PER_PAGE) break;
      page += 1;
    }

    const candidates = allUsers
      .filter((user: any) => Boolean(user.email))
      .filter((user: any) => {
        if (target === "all") return true;
        const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : 0;
        return !lastSignIn || lastSignIn <= cutoff;
      })
      .map((user: any) => ({
        id: user.id,
        email: user.email,
        name: buildMetadataName(user.user_metadata) || user.email.split("@")[0],
        last_sign_in_at: user.last_sign_in_at || null,
      }));

    const recipients = candidates.slice(0, sendLimit);

    if (dryRun) {
      return new Response(JSON.stringify({
        success: true,
        dryRun: true,
        target,
        inactiveDays: days,
        totalMatched: candidates.length,
        sendLimit,
        willSend: recipients.length,
        sample: recipients.slice(0, 10),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const smtpPassword = Deno.env.get("SMTP_PASSWORD");
    if (!smtpPassword) throw new Error("SMTP_PASSWORD is not configured");
    const smtpUsername = Deno.env.get("SMTP_USERNAME") || "moviebay@s-u.in";
    if (recipients.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        target,
        inactiveDays: days,
        totalMatched: candidates.length,
        attempted: 0,
        sent: 0,
        failed: 0,
        failures: [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = buildMarketingHtml(message, previewText, ctaLabel, ctaUrl);
    const conn = await connectSmtp(
      Deno.env.get("SMTP_HOSTNAME") || "mail.spacemail.com",
      Number(Deno.env.get("SMTP_PORT") || 465),
      smtpUsername,
      smtpPassword,
    );

    const sent: string[] = [];
    const failed: Array<{ email: string; error: string }> = [];

    for (const recipient of recipients) {
      try {
        await sendSmtpMail(conn, smtpUsername, recipient.email, subject, html);
        sent.push(recipient.email);
      } catch (err) {
        failed.push({
          email: recipient.email,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    try {
      await writeSmtpCommand(conn, "QUIT");
      await readSmtpResponse(conn);
    } finally {
      conn.close();
    }

    return new Response(JSON.stringify({
      success: true,
      target,
      inactiveDays: days,
      totalMatched: candidates.length,
      attempted: recipients.length,
      sent: sent.length,
      failed: failed.length,
      failures: failed.slice(0, 20),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
