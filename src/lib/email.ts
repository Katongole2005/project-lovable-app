import { supabase } from "@/integrations/supabase/client";

export const sendBrandedEmail = async ({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) => {
  const { data, error } = await supabase.functions.invoke("send-email", {
    body: { to, subject, html },
  });

  if (error) throw error;
  return data;
};

export const getWelcomeEmailHtml = (firstName: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #e5e5e5; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 0 auto; padding: 40px 24px; }
    .logo { font-size: 24px; font-weight: 700; color: #ffffff; margin-bottom: 32px; }
    h1 { font-size: 28px; color: #ffffff; margin-bottom: 16px; }
    p { font-size: 16px; line-height: 1.6; color: #a3a3a3; }
    .btn { display: inline-block; background: #ffffff; color: #0a0a0a; padding: 12px 32px; border-radius: 9999px; text-decoration: none; font-weight: 600; margin-top: 24px; }
    .footer { margin-top: 48px; font-size: 13px; color: #525252; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">MovieBay</div>
    <h1>Welcome, ${firstName}! 🎬</h1>
    <p>Thanks for joining MovieBay. You now have access to thousands of movies, curated collections, and personalized recommendations.</p>
    <p>Start exploring and find your next favorite film.</p>
    <a href="https://premiere-point-web.lovable.app" class="btn">Start Exploring</a>
    <div class="footer">
      <p>© MovieBay · moviebay@s-u.in</p>
    </div>
  </div>
</body>
</html>
`;
