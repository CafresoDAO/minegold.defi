import { useEffect, useRef, useState } from "react";

/**
 * Scroll reveal — a section fades and rises once, when it first enters the
 * viewport. Gated on prefers-reduced-motion: those users get the content
 * immediately at full opacity, never a delayed or hidden section (an
 * animation-gated reveal that never fires is a blank page).
 */
export function Reveal({
  children,
  delayMs = 0,
  className = "",
}: {
  children: React.ReactNode;
  delayMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(() => {
    if (typeof window === "undefined") return true;
    return (
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  });

  useEffect(() => {
    if (shown || !ref.current) return;
    const el = ref.current;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : "translateY(14px)",
        transition: `opacity 600ms var(--ease-settle) ${delayMs}ms, transform 600ms var(--ease-settle) ${delayMs}ms`,
      }}
    >
      {children}
    </div>
  );
}
