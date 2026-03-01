import { useCallback, useRef } from "react";

/**
 * 3D perspective tilt effect for cards (Apple TV+ style).
 * Attach returned handlers + style to the element.
 */
export function useTilt(maxTilt = 8) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const tiltX = (y - 0.5) * -maxTilt;
      const tiltY = (x - 0.5) * maxTilt;
      // gloss position
      const glossX = x * 100;
      const glossY = y * 100;
      el.style.transform = `perspective(600px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(1.03,1.03,1.03)`;
      el.style.setProperty("--gloss-x", `${glossX}%`);
      el.style.setProperty("--gloss-y", `${glossY}%`);
    },
    [maxTilt]
  );

  const handleMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "perspective(600px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)";
    el.style.setProperty("--gloss-x", "50%");
    el.style.setProperty("--gloss-y", "50%");
  }, []);

  return { ref, handleMouseMove, handleMouseLeave };
}
