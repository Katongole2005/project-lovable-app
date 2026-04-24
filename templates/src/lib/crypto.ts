/**
 * Secure URL Encryption Service
 * Uses Web Crypto API (AES-GCM) to generate self-destructing, encrypted URLs.
 */

const SECRET_KEY = import.meta.env.VITE_ENCRYPTION_KEY || "";

/**
 * Encrypts a payload into a URL-safe Base64 token.
 * Payload includes the original URL, title, and a 24-hour expiration timestamp.
 */
export async function generateSecureToken(url: string, title: string): Promise<string | null> {
  if (!SECRET_KEY) return null; // Fallback to raw if no key is configured

  try {
    const payload = JSON.stringify({
      u: url,
      t: title,
      e: Date.now() + 24 * 60 * 60 * 1000 // 24 hours from now
    });

    const encoder = new TextEncoder();
    
    // Pad or truncate secret to exactly 32 bytes (256 bits) for AES-256
    const keyBytes = encoder.encode(SECRET_KEY.padEnd(32, '0').slice(0, 32));
    
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "AES-GCM" },
      false,
      ["encrypt"]
    );

    // Initialization Vector (12 bytes is standard for AES-GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      keyMaterial,
      encoder.encode(payload)
    );

    // Convert to Base64
    const ivBase64 = btoa(String.fromCharCode(...iv));
    const encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)));

    // Create URL-safe token: iv.encryptedData
    const token = `${ivBase64}.${encryptedBase64}`
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    return token;
  } catch (err) {
    console.error("Encryption failed:", err);
    return null;
  }
}
