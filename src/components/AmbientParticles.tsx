import { useEffect, useRef, memo } from "react";

/**
 * Floating bokeh particles background — subtle ambient depth.
 * Uses canvas for performance. Only renders on desktop (>768px).
 */
function AmbientParticlesInner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Check if mobile
    if (window.innerWidth < 768) return;

    let animId: number;
    const dpr = Math.min(window.devicePixelRatio, 2);

    function resize() {
      canvas!.width = window.innerWidth * dpr;
      canvas!.height = window.innerHeight * dpr;
      canvas!.style.width = `${window.innerWidth}px`;
      canvas!.style.height = `${window.innerHeight}px`;
      ctx!.scale(dpr, dpr);
    }
    resize();

    interface Particle {
      x: number;
      y: number;
      r: number;
      dx: number;
      dy: number;
      opacity: number;
      hue: number;
    }

    const particles: Particle[] = Array.from({ length: 18 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 60 + 20,
      dx: (Math.random() - 0.5) * 0.15,
      dy: (Math.random() - 0.5) * 0.1,
      opacity: Math.random() * 0.06 + 0.02,
      hue: Math.random() > 0.5 ? 215 : 195,
    }));

    function draw() {
      ctx!.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (const p of particles) {
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < -p.r) p.x = window.innerWidth + p.r;
        if (p.x > window.innerWidth + p.r) p.x = -p.r;
        if (p.y < -p.r) p.y = window.innerHeight + p.r;
        if (p.y > window.innerHeight + p.r) p.y = -p.r;

        const gradient = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        gradient.addColorStop(0, `hsla(${p.hue}, 60%, 55%, ${p.opacity})`);
        gradient.addColorStop(1, `hsla(${p.hue}, 60%, 55%, 0)`);
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = gradient;
        ctx!.fill();
      }
      animId = requestAnimationFrame(draw);
    }
    draw();

    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      aria-hidden="true"
    />
  );
}

export const AmbientParticles = memo(AmbientParticlesInner);
