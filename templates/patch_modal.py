import sys
with open('c:/Users/shelv/Desktop/scraper/scraper/scraper/moviebay/templates/src/components/MovieModal.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target1 = """                      {!isSeries && movie.download_url && (
                        <Button
                          size="lg"
                          className={cn(
                            "gap-2 rounded-md px-8 h-12 text-base font-semibold transition-all duration-200 hover:scale-[1.02]",
                            TRENDING_ACCENT_BUTTON_CLASS
                          )}
                          onClick={() => onPlay(movie.download_url!, movie.title)}
                        >
                          <Play className="w-5 h-5 fill-current" />
                          Play
                        </Button>
                      )}"""

repl1 = """                      {!isSeries && movie.download_url && (
                        <Button
                          size="lg"
                          className={cn(
                            "gap-2 rounded-md px-8 h-12 text-base font-semibold transition-all duration-200 hover:scale-[1.02]",
                            TRENDING_ACCENT_BUTTON_CLASS
                          )}
                          onClick={() => onPlay(movie.download_url!, movie.title)}
                        >
                          <Play className="w-5 h-5 fill-current" />
                          {movie.server2_url ? "Server 1" : "Play"}
                        </Button>
                      )}
                      {!isSeries && movie.server2_url && (
                        <Button
                          size="lg"
                          className={cn(
                            "gap-2 rounded-md px-8 h-12 text-base font-semibold transition-all duration-200 hover:scale-[1.02]",
                            !movie.download_url ? TRENDING_ACCENT_BUTTON_CLASS : "bg-white/10 text-white hover:bg-white/20 border-2 border-white/20"
                          )}
                          onClick={() => onPlay(movie.server2_url!, movie.title)}
                        >
                          <Play className="w-5 h-5 fill-current" />
                          {movie.download_url ? "Server 2" : "Play"}
                        </Button>
                      )}"""

target2 = """                      {isSeries && series.episodes && series.episodes.length > 0 && (
                        <Button
                          size="lg"
                          className={cn(
                            "gap-2 rounded-md px-8 h-12 text-base font-semibold transition-all duration-200 hover:scale-[1.02]",
                            TRENDING_ACCENT_BUTTON_CLASS
                          )}
                          onClick={() => {
                            const firstEp = series.episodes?.[0];
                            if (firstEp?.download_url) {
                              onPlay(firstEp.download_url, `${movie.title} - S1:E1`);
                            }
                          }}
                        >
                          <Play className="w-5 h-5 fill-current" />
                          Play S1:E1
                        </Button>
                      )}"""

repl2 = """                      {isSeries && series.episodes && series.episodes.length > 0 && (
                        <>
                          {(series.episodes[0]?.download_url || !series.episodes[0]?.server2_url) && (
                            <Button
                              size="lg"
                              className={cn(
                                "gap-2 rounded-md px-8 h-12 text-base font-semibold transition-all duration-200 hover:scale-[1.02]",
                                TRENDING_ACCENT_BUTTON_CLASS
                              )}
                              onClick={() => {
                                const firstEp = series.episodes?.[0];
                                if (firstEp?.download_url) {
                                  onPlay(firstEp.download_url, `${movie.title} - S${firstEp.season_number || 1}:E${firstEp.episode_number || 1}`);
                                }
                              }}
                            >
                              <Play className="w-5 h-5 fill-current" />
                              {series.episodes[0]?.server2_url ? "Ep 1 (Server 1)" : "Play S1:E1"}
                            </Button>
                          )}
                          {series.episodes[0]?.server2_url && (
                            <Button
                              size="lg"
                              className={cn(
                                "gap-2 rounded-md px-8 h-12 text-base font-semibold transition-all duration-200 hover:scale-[1.02]",
                                !series.episodes[0]?.download_url ? TRENDING_ACCENT_BUTTON_CLASS : "bg-white/10 text-white hover:bg-white/20 border-2 border-white/20"
                              )}
                              onClick={() => {
                                const firstEp = series.episodes?.[0];
                                if (firstEp?.server2_url) {
                                  onPlay(firstEp.server2_url, `${movie.title} - S${firstEp.season_number || 1}:E${firstEp.episode_number || 1}`);
                                }
                              }}
                            >
                              <Play className="w-5 h-5 fill-current" />
                              {series.episodes[0]?.download_url ? "Ep 1 (Server 2)" : "Play S1:E1"}
                            </Button>
                          )}
                        </>
                      )}"""

# Replace tabs with spaces if present or normalize lines
import re
def normalize_spaces(s):
    # just basic normalization for exact matching if indent differs slightly, but we will try exact first.
    return s

new_text = text.replace(target1, repl1)
if new_text != text:
    print("Replaced target 1!")
    text = new_text
else:
    print("Failed to replace target 1.")

new_text = text.replace(target2, repl2)
if new_text != text:
    print("Replaced target 2!")
    text = new_text
else:
    print("Failed to replace target 2.")
    
with open('c:/Users/shelv/Desktop/scraper/scraper/scraper/moviebay/templates/src/components/MovieModal.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
