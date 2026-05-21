with open("src/components/HeroCarousel.tsx", "r") as f:
    content = f.read()

# Force shouldAutoplay
content = content.replace(
    "const shouldAutoplay = totalSlides > 1 && !deviceProfile.prefersReducedMotion;",
    "const shouldAutoplay = totalSlides > 1;"
)

# Bulletproof interval
old_effect = """  React.useEffect(() => {
    if (!shouldAutoplay) return;
    const timer = window.setInterval(() => {
      scrollNext();
    }, autoplayDelayMs);
    return () => window.clearInterval(timer);
  }, [autoplayDelayMs, scrollNext, shouldAutoplay]);"""

new_effect = """  React.useEffect(() => {
    if (!shouldAutoplay || totalSlides <= 1) return;
    const timer = window.setInterval(() => {
      setSelectedIndex(prev => (prev + 1) % totalSlides);
    }, 4000); // hardcoded to 4000ms to be absolutely sure
    return () => window.clearInterval(timer);
  }, [shouldAutoplay, totalSlides]);"""

content = content.replace(old_effect, new_effect)

with open("src/components/HeroCarousel.tsx", "w") as f:
    f.write(content)
