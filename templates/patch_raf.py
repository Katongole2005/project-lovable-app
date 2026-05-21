with open("src/components/HeroCarousel.tsx", "r") as f:
    content = f.read()

# Replace the interval block with requestAnimationFrame timer
old_block = """  React.useEffect(() => {
    if (!shouldAutoplay || totalSlides <= 1) return;
    const timer = window.setInterval(() => {
      setSelectedIndex(prev => (prev + 1) % totalSlides);
    }, 4000); // hardcoded to 4000ms to be absolutely sure
    return () => window.clearInterval(timer);
  }, [shouldAutoplay, totalSlides]);"""

new_block = """  React.useEffect(() => {
    if (!shouldAutoplay || totalSlides <= 1) return;
    let animationFrameId: number;
    let lastTime = performance.now();
    const delay = autoplayDelayMs || 4000;
    
    const loop = (time: number) => {
      if (time - lastTime >= delay) {
        setSelectedIndex(prev => (prev + 1) % totalSlides);
        lastTime = time;
      }
      animationFrameId = requestAnimationFrame(loop);
    };
    
    animationFrameId = requestAnimationFrame(loop);
    
    return () => cancelAnimationFrame(animationFrameId);
  }, [shouldAutoplay, totalSlides, autoplayDelayMs]);"""

content = content.replace(old_block, new_block)

with open("src/components/HeroCarousel.tsx", "w") as f:
    f.write(content)
