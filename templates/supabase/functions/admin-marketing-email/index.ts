import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FUNCTION_VERSION = "marketing-email-brevo-batch-v9";
const FALLBACK_ADMIN_EMAIL = "shelvinjoe11@gmail.com";
const EMAIL_LOGO_URL = "https://pub-05955d1747df4f86b7854058d3ab270b.r2.dev/joe/logo-dark.png";
const USERS_PER_PAGE = 200;
const MAX_SEND_LIMIT = 1000;
const DEFAULT_SEND_LIMIT = 50;
const RESEND_BATCH_SIZE = 100;
const BREVO_BATCH_SIZE = 1000;
const MAX_SCAN_PAGES = 10;

type MarketingRecipient = {
  id: string;
  email: string;
  name: string;
  last_sign_in_at: string | null;
};

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

function getFirstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

function cleanPersonalizationValue(value: string): string {
  return value.replace(/[<>{}]/g, "").trim();
}

function applyNameToken(value: string): string {
  return value
    .replace(/\{\{\s*(name|user_name|display_name)\s*\}\}/gi, "{{params.name}}")
    .replace(/\{\{\s*(first_name|firstName)\s*\}\}/gi, "{{params.firstName}}")
    .replace(/\[\s*(name|user_name|display_name)\s*\]/gi, "{{params.name}}")
    .replace(/\[\s*(first_name|firstName)\s*\]/gi, "{{params.firstName}}");
}

function renderNameToken(value: string, recipient: MarketingRecipient): string {
  const safeName = cleanPersonalizationValue(recipient.name) || "MovieBay fan";
  const safeEmail = cleanPersonalizationValue(recipient.email);
  const safeFirstName = getFirstName(safeName);

  return value
    .replace(/\{\{\s*params\.name\s*\}\}/gi, safeName)
    .replace(/\{\{\s*params\.firstName\s*\}\}/gi, safeFirstName)
    .replace(/\{\{\s*params\.email\s*\}\}/gi, safeEmail)
    .replace(/\{\{\s*(name|user_name|display_name)\s*\}\}/gi, safeName)
    .replace(/\{\{\s*(first_name|firstName)\s*\}\}/gi, safeFirstName)
    .replace(/\[\s*(name|user_name|display_name)\s*\]/gi, safeName)
    .replace(/\[\s*(first_name|firstName)\s*\]/gi, safeFirstName);
}

function buildMarketingHtml(message: string, previewText: string, ctaLabel: string, ctaUrl: string): string {
  const paragraphs = message
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${applyNameToken(escapeHtml(paragraph)).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const safeCtaUrl = escapeHtml(ctaUrl);
  const safeCtaLabel = escapeHtml(ctaLabel);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MovieBay</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');
    body { margin: 0; padding: 0; background: #050506; color: #f8fafc; font-family: 'Outfit', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    table { border-collapse: collapse; }
    img { border: 0; display: block; max-width: 100%; }
    a { color: inherit; }
    .preview { display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent; mso-hide: all; }
    .shell { width: 100%; background: #050506; padding: 40px 12px; }
    .card { width: 100%; max-width: 600px; margin: 0 auto; overflow: hidden; border: 1px solid #202024; border-top: 4px solid #e50914; border-radius: 16px; background: #0c0c0e; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5); }
    .hero { padding: 40px 40px 30px; background: linear-gradient(180deg, #18090a 0%, #0c0c0e 100%); }
    .logo { width: 154px; height: auto; margin-bottom: 24px; }
    .badge { display: inline-block; padding: 4px 10px; background: rgba(229, 9, 20, 0.12); border-radius: 6px; border: 1px solid rgba(229, 9, 20, 0.25); margin-bottom: 16px; }
    .kicker { margin: 0; color: #ff4d57; font-size: 11px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; }
    .name { margin: 0; color: #ffffff; font-size: 32px; line-height: 1.15; font-weight: 900; letter-spacing: -0.02em; }
    .sub { margin: 12px 0 0; color: #a1a1aa; font-size: 15px; line-height: 1.6; }
    .content { padding: 10px 40px 20px; background: #0c0c0e; }
    .content p { color: #d4d4d8; font-size: 15px; line-height: 1.7; margin: 0 0 20px; }
    .panel { margin: 24px 0 24px; border: 1px solid #202024; border-left: 4px solid #e50914; border-radius: 0 12px 12px 0; background: #121214; }
    .panel td { padding: 16px 20px; color: #a1a1aa; font-size: 13.5px; line-height: 1.6; }
    .btn-wrap { padding: 10px 40px 40px; background: #0c0c0e; }
    .btn { display: inline-block; padding: 14px 28px; border-radius: 8px; background: linear-gradient(135deg, #e50914 0%, #b2060f 100%); color: #ffffff !important; font-size: 15px; font-weight: 700; text-decoration: none; letter-spacing: 0.3px; box-shadow: 0 8px 24px rgba(229, 9, 20, 0.25); text-align: center; }
    .footer { padding: 30px 40px; border-top: 1px solid #1c1c1f; background: #08080a; text-align: center; }
    .footer p { margin: 0; color: #71717a; font-size: 12px; line-height: 1.7; }
    .footer strong { color: #e4e4e7; }
    .footer a { color: #a1a1aa; text-decoration: none; font-weight: 600; transition: color 0.2s; }
    .footer a:hover { color: #ffffff; }
    @media only screen and (max-width: 520px) {
      .shell { padding: 16px 8px; }
      .card { border-radius: 12px; }
      .hero, .content, .btn-wrap, .footer { padding-left: 20px !important; padding-right: 20px !important; }
      .name { font-size: 26px !important; }
      .logo { width: 130px !important; }
      .btn { display: block !important; box-sizing: border-box; }
    }
  </style>
</head>
<body>
  <div class="preview">${applyNameToken(escapeHtml(previewText))}</div>
  <table role="presentation" width="100%" class="shell">
    <tr>
      <td align="center">
        <table role="presentation" class="card">
          <tr>
            <td class="hero">
              <a href="${safeCtaUrl}" style="display:inline-block;text-decoration:none;">
                <img class="logo" src="${EMAIL_LOGO_URL}" width="154" alt="MovieBay">
              </a>
              <div>
                <div class="badge">
                  <p class="kicker">MovieBay update</p>
                </div>
              </div>
              <h1 class="name">Made for {{params.name}}</h1>
              <p class="sub">Fresh movies, smooth watching, and the latest MovieBay picks are waiting for you.</p>
            </td>
          </tr>
          <tr>
            <td class="content">
              ${paragraphs}
              <table role="presentation" width="100%" class="panel">
                <tr>
                  <td>
                    <strong style="color:#ffffff; font-size: 14px;">Your MovieBay account</strong><br>
                    <span style="display:inline-block; margin-top: 4px;">This email was personalized for {{params.name}} using the name saved on your MovieBay profile.</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="btn-wrap">
              <a class="btn" href="${safeCtaUrl}">${safeCtaLabel}</a>
            </td>
          </tr>
          <tr>
            <td class="footer">
              <p><strong>MovieBay</strong> · Luganda translated movies and entertainment.</p>
              <p style="margin-top:6px;">You are receiving this because you created a MovieBay account. Visit <a href="https://www.s-u.in" target="_blank">s-u.in</a> to continue watching.</p>
              <p style="margin-top:14px;color:#52525b;">© 2026 MovieBay. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
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

async function sendResendMail(apiKey: string, fromEmail: string, toEmail: string, subject: string, html: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `MovieBay <${fromEmail}>`,
      to: [toEmail],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    let details = await response.text();
    try {
      const parsed = JSON.parse(details);
      details = parsed?.message || parsed?.error || details;
    } catch {
      // Keep the raw provider response.
    }
    throw new Error(`Resend failed: ${response.status} ${details}`);
  }
}

async function sendResendBatch(apiKey: string, fromEmail: string, recipients: MarketingRecipient[], subject: string, html: string) {
  const response = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify(recipients.map((recipient) => ({
      from: `MovieBay <${fromEmail}>`,
      to: [recipient.email],
      subject: renderNameToken(subject, recipient),
      html: renderNameToken(html, recipient),
    }))),
  });

  if (!response.ok) {
    let details = await response.text();
    try {
      const parsed = JSON.parse(details);
      details = parsed?.message || parsed?.error || details;
    } catch {
      // Keep the raw provider response.
    }
    throw new Error(`Resend batch failed: ${response.status} ${details}`);
  }
}

async function sendBrevoBatch(apiKey: string, fromEmail: string, fromName: string, recipients: MarketingRecipient[], subject: string, html: string): Promise<string[]> {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        email: fromEmail,
        name: fromName,
      },
      subject: applyNameToken(subject),
      htmlContent: html,
      messageVersions: recipients.map((recipient) => ({
        to: [{
          email: recipient.email,
          name: cleanPersonalizationValue(recipient.name) || "MovieBay fan",
        }],
        params: {
          name: cleanPersonalizationValue(recipient.name) || "MovieBay fan",
          firstName: getFirstName(cleanPersonalizationValue(recipient.name) || "MovieBay fan"),
          email: cleanPersonalizationValue(recipient.email),
        },
      })),
    }),
  });

  if (!response.ok) {
    let details = await response.text();
    try {
      const parsed = JSON.parse(details);
      details = parsed?.message || parsed?.error || parsed?.code || details;
    } catch {
      // Keep the raw provider response.
    }
    throw new Error(`Brevo batch failed: ${response.status} ${details}`);
  }

  const data = await response.json().catch(() => ({}));
  return Array.isArray(data?.messageIds) ? data.messageIds : [];
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
) {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index], index);
    }
  });

  await Promise.all(runners);
}

function isLikelyEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function collectRecipients(params: {
  adminClient: any;
  target: string;
  cutoff: number;
  limit: number;
  selectedUserIds?: string[];
}): Promise<{
  recipients: MarketingRecipient[];
  matchedCount: number;
  scannedUsers: number;
  scannedPages: number;
  scanLimited: boolean;
}> {
  const recipients: MarketingRecipient[] = [];
  const selectedUserIdSet = new Set(params.selectedUserIds || []);
  const maxRecipients = params.target === "specific"
    ? Math.min(params.limit, selectedUserIdSet.size)
    : params.limit;
  let matchedCount = 0;
  let scannedUsers = 0;
  let page = 1;

  while (page <= MAX_SCAN_PAGES && recipients.length < maxRecipients) {
    const { data: usersData, error: usersError } = await params.adminClient.auth.admin.listUsers({
      page,
      perPage: USERS_PER_PAGE,
    });
    if (usersError) throw usersError;

    const batch = usersData?.users || [];
    scannedUsers += batch.length;

    for (const user of batch) {
      if (!user.email || !isLikelyEmail(user.email)) continue;

      if (params.target === "specific" && !selectedUserIdSet.has(user.id)) continue;

      if (params.target !== "all") {
        const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : 0;
        if (params.target !== "specific" && lastSignIn && lastSignIn > params.cutoff) continue;
      }

      matchedCount += 1;
      if (recipients.length < maxRecipients) {
        recipients.push({
          id: user.id,
          email: user.email,
          name: buildMetadataName(user.user_metadata) || user.email.split("@")[0],
          last_sign_in_at: user.last_sign_in_at || null,
        });
      }
    }

    if (batch.length < USERS_PER_PAGE) {
      return {
        recipients,
        matchedCount,
        scannedUsers,
        scannedPages: page,
        scanLimited: false,
      };
    }

    page += 1;
  }

  return {
    recipients,
    matchedCount,
    scannedUsers,
    scannedPages: page - 1,
    scanLimited: params.target === "specific"
      ? recipients.length < selectedUserIdSet.size && page > MAX_SCAN_PAGES
      : recipients.length >= params.limit || page > MAX_SCAN_PAGES,
  };
}

async function sendMarketingEmails(params: {
  recipients: MarketingRecipient[];
  subject: string;
  html: string;
  fromEmail: string;
  fromName: string;
  brevoApiKey: string | null;
  resendApiKey: string | null;
  smtpPassword: string | null;
  smtpUsername: string;
}): Promise<{ sent: string[]; failed: Array<{ email: string; error: string }>; providerMessageIds: string[] }> {
  const sent: string[] = [];
  const failed: Array<{ email: string; error: string }> = [];
  const providerMessageIds: string[] = [];

  if (params.brevoApiKey) {
    const batches = chunkArray(params.recipients, BREVO_BATCH_SIZE);
    const brevoConcurrency = Math.max(1, Math.min(Number(Deno.env.get("BREVO_CONCURRENCY") || 1), 3));

    await runWithConcurrency(batches, brevoConcurrency, async (batch) => {
      try {
        const messageIds = await sendBrevoBatch(params.brevoApiKey!, params.fromEmail, params.fromName, batch, params.subject, params.html);
        providerMessageIds.push(...messageIds);
        sent.push(...batch.map((recipient) => recipient.email));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        failed.push(...batch.map((recipient) => ({
          email: recipient.email,
          error: message,
        })));
      }
    });

    return { sent, failed, providerMessageIds };
  }

  if (params.resendApiKey) {
    const batches = chunkArray(params.recipients, RESEND_BATCH_SIZE);
    const resendConcurrency = Math.max(1, Math.min(Number(Deno.env.get("RESEND_CONCURRENCY") || 2), 5));

    await runWithConcurrency(batches, resendConcurrency, async (batch) => {
      try {
        await sendResendBatch(params.resendApiKey!, params.fromEmail, batch, params.subject, params.html);
        sent.push(...batch.map((recipient) => recipient.email));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        failed.push(...batch.map((recipient) => ({
          email: recipient.email,
          error: message,
        })));
      }
    });

    return { sent, failed, providerMessageIds };
  }

  if (!params.smtpPassword) {
    throw new Error("Email provider is not configured. Set BREVO_API_KEY or RESEND_API_KEY for fast sending, or set SMTP_PASSWORD for small SMTP tests.");
  }
  if (typeof Deno.connectTls !== "function") {
    throw new Error("SMTP is not supported by this Edge runtime. Configure BREVO_API_KEY or RESEND_API_KEY for fast HTTP email sending.");
  }

  const conn = await connectSmtp(
    Deno.env.get("SMTP_HOSTNAME") || "mail.spacemail.com",
    Number(Deno.env.get("SMTP_PORT") || 465),
    params.smtpUsername,
    params.smtpPassword,
  );

  try {
    for (const recipient of params.recipients) {
      try {
        await sendSmtpMail(
          conn,
          params.fromEmail,
          recipient.email,
          renderNameToken(params.subject, recipient),
          renderNameToken(params.html, recipient),
        );
        sent.push(recipient.email);
      } catch (err) {
        failed.push({
          email: recipient.email,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    await writeSmtpCommand(conn, "QUIT");
    await readSmtpResponse(conn);
  } finally {
    conn.close();
  }

  return { sent, failed, providerMessageIds };
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
      selectedUserIds = [],
      inactiveDays = 30,
      limit = DEFAULT_SEND_LIMIT,
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

    const safeSelectedUserIds = Array.isArray(selectedUserIds)
      ? selectedUserIds
          .map((id) => String(id || "").trim())
          .filter((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))
          .slice(0, MAX_SEND_LIMIT)
      : [];

    if (target === "specific" && safeSelectedUserIds.length === 0) {
      return new Response(JSON.stringify({ error: "Select at least one specific user before sending." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requestedLimit = target === "specific" ? safeSelectedUserIds.length : limit;
    const sendLimit = Math.max(1, Math.min(Number(requestedLimit) || DEFAULT_SEND_LIMIT, MAX_SEND_LIMIT));
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

    const brevoApiKey = Deno.env.get("BREVO_API_KEY") || Deno.env.get("SENDINBLUE_API_KEY") || null;
    const resendApiKey = Deno.env.get("RESEND_API_KEY") || null;
    const smtpPassword = Deno.env.get("SMTP_PASSWORD") || null;
    const smtpUsername = Deno.env.get("SMTP_USERNAME") || "moviebay@s-u.in";
    const fromEmail =
      Deno.env.get("BREVO_FROM_EMAIL") ||
      Deno.env.get("RESEND_FROM_EMAIL") ||
      Deno.env.get("SMTP_FROM_EMAIL") ||
      smtpUsername;
    const fromName = Deno.env.get("BREVO_FROM_NAME") || Deno.env.get("EMAIL_FROM_NAME") || "MovieBay";
    const provider = brevoApiKey ? "brevo" : resendApiKey ? "resend" : smtpPassword ? "smtp" : null;

    if (dryRun) {
      const audience = await collectRecipients({
        adminClient,
        target,
        cutoff,
        limit: sendLimit,
        selectedUserIds: safeSelectedUserIds,
      });

      return new Response(JSON.stringify({
        success: true,
        version: FUNCTION_VERSION,
        dryRun: true,
        target,
        inactiveDays: days,
        totalMatched: audience.matchedCount,
        sendLimit,
        selectedCount: target === "specific" ? safeSelectedUserIds.length : undefined,
        willSend: audience.recipients.length,
        scannedUsers: audience.scannedUsers,
        scannedPages: audience.scannedPages,
        scanLimited: audience.scanLimited,
        providerReady: Boolean(brevoApiKey || resendApiKey || smtpPassword),
        provider,
        providerLimit: brevoApiKey || resendApiKey ? MAX_SEND_LIMIT : smtpPassword ? 10 : 0,
        fromEmail,
        sample: audience.recipients.slice(0, 10),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = buildMarketingHtml(message, previewText, ctaLabel, ctaUrl);
    const audience = await collectRecipients({
      adminClient,
      target,
      cutoff,
      limit: sendLimit,
      selectedUserIds: safeSelectedUserIds,
    });

    if (audience.recipients.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        version: FUNCTION_VERSION,
        target,
        inactiveDays: days,
        totalMatched: audience.matchedCount,
        attempted: 0,
        sent: 0,
        failed: 0,
        provider,
        fromEmail,
        failures: [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!brevoApiKey && !resendApiKey && sendLimit > 10) {
      return new Response(JSON.stringify({
        version: FUNCTION_VERSION,
        error: "Fast campaigns above 10 users require BREVO_API_KEY or RESEND_API_KEY. SMTP works for small tests, but it is too slow for 120-user marketing sends and will timeout.",
        target,
        inactiveDays: days,
        totalMatched: audience.matchedCount,
        attempted: 0,
        sent: 0,
        failed: 0,
        provider: smtpPassword ? "smtp" : null,
        providerLimit: smtpPassword ? 10 : 0,
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { sent, failed, providerMessageIds } = await sendMarketingEmails({
      recipients: audience.recipients,
      subject,
      html,
      fromEmail,
      fromName,
      brevoApiKey,
      resendApiKey,
      smtpPassword,
      smtpUsername,
    });

    if (sent.length === 0 && failed.length > 0) {
      return new Response(JSON.stringify({
        version: FUNCTION_VERSION,
        error: failed[0].error,
        target,
        inactiveDays: days,
        totalMatched: audience.matchedCount,
        attempted: audience.recipients.length,
        sent: 0,
        failed: failed.length,
        provider,
        providerAccepted: sent.length,
        providerMessageIds: providerMessageIds.slice(0, 20),
        fromEmail,
        failures: failed.slice(0, 20),
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      version: FUNCTION_VERSION,
      target,
      inactiveDays: days,
      totalMatched: audience.matchedCount,
      attempted: audience.recipients.length,
      sent: sent.length,
      failed: failed.length,
      provider,
      providerAccepted: sent.length,
      providerMessageIds: providerMessageIds.slice(0, 20),
      fromEmail,
      failures: failed.slice(0, 20),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ version: FUNCTION_VERSION, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
