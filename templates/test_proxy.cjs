function unwrapLegacyWorkerUrl(url) {
  try {
    const parsed = new URL(url);
    if (!/cdn\.s-u\.in$/i.test(parsed.hostname)) return url;
    return parsed.searchParams.get("url") || url;
  } catch {
    return url;
  }
}

function shouldProxyMediaUrl(url) {
  if (!url) return false;
  const normalized = unwrapLegacyWorkerUrl(url);
  return (
    /mobifliks\.(info|com)/i.test(normalized) ||
    /zflix\.(click|com)/i.test(normalized) ||
    /download(mp4|serie|video|mp3)\.php/i.test(normalized) ||
    /\/watch\/(mp4|serie|video|file)\//i.test(normalized) ||
    /\/download\/(mp4|serie|video|file)\//i.test(normalized) ||
    /b-cdn\.net/i.test(normalized) ||
    /pearlpix\.xyz/i.test(normalized) ||
    /bunnycdn\.com/i.test(normalized) ||
    /storage\.googleapis\.com/i.test(normalized) ||
    /\.(mp4|m4v|webm|m3u8|mov|avi|mkv)(\?|$)/i.test(normalized) ||
    /munoserver/i.test(normalized) ||
    /munotech/i.test(normalized)
  );
}

console.log(shouldProxyMediaUrl("https://munotek-vault.b-cdn.net/stw42/fya/My.Dearest.Assassin.2026.1080p.WEB.h264-EDITH.mp4"));
