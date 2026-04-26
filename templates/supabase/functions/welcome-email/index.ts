
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const SMTP_HOSTNAME = Deno.env.get("SMTP_HOSTNAME") || "mail.spacemail.com";
const SMTP_PORT = parseInt(Deno.env.get("SMTP_PORT") || "465");
const SMTP_USERNAME = Deno.env.get("SMTP_USERNAME") || "support@s-u.in";
const SMTP_PASSWORD = Deno.env.get("SMTP_PASSWORD") || "Shelvin2005.";

serve(async (req) => {
  try {
    const { email, display_name } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), { status: 400 });
    }

    const client = new SmtpClient();
    
    await client.connectTLS({
      hostname: SMTP_HOSTNAME,
      port: SMTP_PORT,
      username: SMTP_USERNAME,
      password: SMTP_PASSWORD,
    });

    await client.send({
      from: SMTP_USERNAME,
      to: email,
      subject: "Welcome to MovieBay! 🎬",
      content: `
        Hi ${display_name || 'Movie Lover'},

        Welcome to MovieBay - The Legendary Movie Experience! 
        
        We're excited to have you on board. Your account is now active and you can start climbing the Legends Ladder right away!
        
        Check out the latest movies and start earning your activity points!
        
        Cheers,
        The MovieBay Team
      `,
    });

    await client.close();

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("Email error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
})
