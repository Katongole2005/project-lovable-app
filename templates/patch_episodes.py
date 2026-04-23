import os

path = 'c:/Users/shelv/Desktop/scraper/scraper/scraper/moviebay/templates/src/components/MovieModal.tsx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# First replace the onClick handler for MobileEpisodeCard
target_mobile_click = """      onClick={() => {
        if (hasVideo && episode.download_url) {
          onPlay(episode.download_url, `${seriesTitle} - S${seasonNumber}:E${episode.episode_number}`);
        }
      }}"""
repl_mobile_click = """      onClick={() => {
        if (hasVideo) {
          const targetUrl = episode.download_url || episode.server2_url;
          if (targetUrl) onPlay(targetUrl, `${seriesTitle} - S${seasonNumber}:E${episode.episode_number}`);
        }
      }}"""
if target_mobile_click in text:
    text = text.replace(target_mobile_click, repl_mobile_click)
    print("Replaced Mobile click")

# Replace DesktopEpisodeCard click
target_desktop_click = """      onClick={() => {
        if (hasVideo && episode.download_url) {
          onPlay(
            episode.download_url,
            `${seriesTitle} - S${episode.season_number ?? 1}:E${episode.episode_number}`
          );
        }
      }}"""
repl_desktop_click = """      onClick={() => {
        if (hasVideo) {
          const targetUrl = episode.download_url || episode.server2_url;
          if (targetUrl) {
            onPlay(
              targetUrl,
              `${seriesTitle} - S${episode.season_number ?? 1}:E${episode.episode_number}`
            );
          }
        }
      }}"""
if target_desktop_click in text:
    text = text.replace(target_desktop_click, repl_desktop_click)
    print("Replaced Desktop click")

# Replace hasVideo definitions
target_hasVideo1 = """  const hasVideo = episode.download_url &&
    (episode.download_url.includes(".mp4") ||
      episode.download_url.includes("downloadmp4") ||
      episode.download_url.includes("downloadserie"));"""
repl_hasVideo1 = """  const hasVideo = (episode.download_url &&
    (episode.download_url.includes(".mp4") ||
      episode.download_url.includes("downloadmp4") ||
      episode.download_url.includes("downloadserie"))) || !!episode.server2_url;"""

text = text.replace(target_hasVideo1, repl_hasVideo1)

# Replace the buttons in Desktop hovered state
target_desktop_buttons = """        <div className="mt-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {hasVideo && (
            <>
              <Button
                size="sm"
                className="gap-1.5 bg-white text-black hover:bg-white/90 h-8 px-4 rounded font-medium"
                onClick={(e) => {
                  e.stopPropagation();
                  onPlay(
                    episode.download_url!,
                    `${seriesTitle} - S${episode.season_number ?? 1}:E${episode.episode_number}`
                  );
                }}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Play
              </Button>"""
repl_desktop_buttons = """        <div className="mt-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {hasVideo && (
            <>
              {(episode.download_url || !episode.server2_url) && (
                <Button
                  size="sm"
                  className="gap-1.5 bg-white text-black hover:bg-white/90 h-8 px-4 rounded font-medium"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlay(
                      episode.download_url!,
                      `${seriesTitle} - S${episode.season_number ?? 1}:E${episode.episode_number}`
                    );
                  }}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  {episode.server2_url ? "S1" : "Play"}
                </Button>
              )}
              {episode.server2_url && (
                <Button
                  size="sm"
                  className="gap-1.5 bg-white/10 text-white hover:bg-white/20 border border-white/20 h-8 px-3 rounded font-medium"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlay(
                      episode.server2_url!,
                      `${seriesTitle} - S${episode.season_number ?? 1}:E${episode.episode_number}`
                    );
                  }}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  {episode.download_url ? "S2" : "Play"}
                </Button>
              )}"""

if target_desktop_buttons in text:
    text = text.replace(target_desktop_buttons, repl_desktop_buttons)
    print("Replaced desktop buttons")


with open(path, 'w', encoding='utf-8') as f:
    f.write(text)
