const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "10minutemail.com",
  "10minutemail.net",
  "20minutemail.com",
  "33mail.com",
  "anonaddy.com",
  "anonymmail.net",
  "burnermail.io",
  "byom.de",
  "catchmail.com",
  "dispostable.com",
  "emailondeck.com",
  "fakeinbox.com",
  "getnada.com",
  "guerrillamail.biz",
  "guerrillamail.com",
  "guerrillamail.de",
  "guerrillamail.info",
  "guerrillamail.net",
  "guerrillamail.org",
  "inboxbear.com",
  "maildrop.cc",
  "mailinator.com",
  "mailnesia.com",
  "mailnull.com",
  "mintemail.com",
  "moakt.com",
  "mohmal.com",
  "mytemp.email",
  "sharklasers.com",
  "spam4.me",
  "temp-mail.io",
  "temp-mail.org",
  "tempmail.com",
  "tempmail.net",
  "tempmailo.com",
  "throwawaymail.com",
  "trashmail.com",
  "trashmail.net",
  "yopmail.com",
]);

const DISPOSABLE_DOMAIN_PATTERNS = [
  /(^|\.)guerrillamail\./,
  /(^|\.)mailinator\./,
  /(^|\.)tempmail/,
  /(^|\.)temp-mail/,
  /(^|\.)trashmail/,
  /(^|\.)yopmail\./,
];

export function getEmailDomain(email: string) {
  const domain = email.trim().toLowerCase().split("@").pop() || "";
  return domain.replace(/\.+$/, "");
}

export function isDisposableEmail(email: string) {
  const domain = getEmailDomain(email);
  if (!domain || !domain.includes(".")) return false;

  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) return true;
  if (DISPOSABLE_DOMAIN_PATTERNS.some((pattern) => pattern.test(domain))) return true;

  const parts = domain.split(".");
  for (let i = 1; i < parts.length - 1; i += 1) {
    const parentDomain = parts.slice(i).join(".");
    if (DISPOSABLE_EMAIL_DOMAINS.has(parentDomain)) return true;
  }

  return false;
}
