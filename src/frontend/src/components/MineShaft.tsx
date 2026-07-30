import { useEffect, useRef, useState } from "react";

/**
 * The Shaft — the single progress display for the 12-confirmation wait.
 *
 * A phone is portrait and a mine shaft is portrait. The camera descends a
 * vertical shaft; each of the 12 Ethereum confirmations breaks through one
 * rock stratum (REAL chain data via useEthConfirmations — never a wall-clock
 * fake); below the strata lies the crystalline "chain-key seam" (the ICP
 * bridge moment), and beneath it the gold chamber glows brighter as you
 * approach. This one object replaces the old stack of four competing
 * indicators (stepper bar, bridge %, confirmation meter, mining diorama).
 *
 * Honest by construction: depth = confirmations. If the chain stalls, the
 * drill visibly waits at the current stratum — no creeping fake progress.
 *
 * Fixes two defects of the old MiningAnimation on the way: size responds to
 * container changes (ResizeObserver, not a mount-time snapshot) and
 * prefers-reduced-motion is a live media-query listener (static frame, no
 * animation loop) rather than a one-time read.
 */

type Stage =
  /** Tx broadcast, not yet mined — drill idles at the surface. */
  | "surface"
  /** Mined; breaking through stratum `confirmations` of `target`. */
  | "confirming"
  /** All strata broken — hovering at the chain-key seam, waiting on the
   *  minter to credit ckUNI. Seam pulses. */
  | "sealing";

type Props = {
  confirmations: number;
  targetConfirmations: number;
  stage: Stage;
  /** Canvas CSS height. Width tracks the container. Omit for the responsive
   *  default: clamp(320, 52vh, 520) — tall enough to read, never most of a
   *  phone screen. */
  height?: number;
  /** Decorative mode (the landing hero). Suppresses every readout — block
   *  numbers, confirmation ticks, chain labels — because on a marketing
   *  surface none of them is bound to a verified quantity. The doctrine:
   *  a mining image may show a number only when a physical property of the
   *  picture maps 1:1 to something on-chain. Here nothing does. */
  decorative?: boolean;
};

type Particle = {
  x: number;
  y: number; // world coords
  vx: number;
  vy: number;
  life: number; // 0..1
  gold: boolean;
};

/** Deterministic per-stratum jitter so edges look rocky but stable. */
const jitter = (seed: number): number => {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Dev harness: open the app with ?shaft_demo to watch a full simulated
 *  descent (one confirmation every 2.5 s, then the seam). Design-iteration
 *  tool — no money paths involved. */
export function MineShaftDemo() {
  const [confs, setConfs] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setConfs((c) => (c >= 14 ? 0 : c + 1)), 2_500);
    return () => clearInterval(id);
  }, []);
  const stage = confs === 0 ? "surface" : confs >= 12 ? "sealing" : "confirming";
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-3">
        <p className="text-center text-xs font-mono text-zinc-500">
          shaft demo · conf {Math.min(confs, 12)}/12 · stage {stage}
        </p>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden">
          <MineShaft
            confirmations={Math.min(confs, 12)}
            targetConfirmations={12}
            stage={stage}
            height={480}
          />
        </div>
      </div>
    </div>
  );
}

export function MineShaft({
  confirmations,
  targetConfirmations,
  stage,
  height = 380,
  decorative = false,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Live inputs for the render loop (avoids re-creating the loop per prop).
  const inputRef = useRef({ confirmations, targetConfirmations, stage, decorative });
  inputRef.current = { confirmations, targetConfirmations, stage, decorative };
  // Set by the main effect; lets the prop-change effect force a redraw in
  // reduced-motion (static) mode where no animation loop is running.
  const redrawRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ── live reduced-motion + resize ────────────────────────────────────
    const rmQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let reduced = rmQuery?.matches ?? false;

    let cssW = wrap.clientWidth || 300;
    const computeH = () =>
      height ??
      Math.max(320, Math.min(520, Math.round((window.innerHeight || 760) * 0.52)));
    let cssH = computeH();
    const applySize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cssW = wrap.clientWidth || 300;
      cssH = computeH();
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    applySize();
    const ro = new ResizeObserver(() => {
      applySize();
      if (reduced) drawFrame(0);
    });
    ro.observe(wrap);
    // ResizeObserver tracks the wrapper's WIDTH; the responsive height reads
    // the viewport, so viewport resizes need their own listener.
    const onWinResize = () => {
      applySize();
      if (reduced) drawFrame(0);
    };
    window.addEventListener("resize", onWinResize);

    // ── world geometry (CSS px, world y grows downward) ─────────────────
    const PAD_TOP = 44; // surface / sky sliver
    const BAND_H = 46; // one stratum per confirmation
    const SEAM_H = 42; // the chain-key seam
    const CHAMBER_H = 150; // gold chamber

    let cameraY = 0; // world y rendered at canvas top
    let drillYSmooth = PAD_TOP;
    let breakProgress = 0; // 0..1 crack animation within current stratum
    let lastConfs = -1;
    let particles: Particle[] = [];
    let t = 0;

    const spawnBurst = (x: number, y: number, gold: boolean, n: number) => {
      for (let i = 0; i < n; i++) {
        particles.push({
          x: x + (Math.random() - 0.5) * 24,
          y: y + (Math.random() - 0.5) * 8,
          vx: (Math.random() - 0.5) * 1.6,
          vy: -Math.random() * 1.4 - 0.2,
          life: 1,
          gold,
        });
      }
      if (particles.length > 160) particles = particles.slice(-160);
    };

    const drawFrame = (dt: number) => {
      const { confirmations: confsRaw, targetConfirmations: target, stage: st } =
        inputRef.current;
      const confs = Math.min(confsRaw, target);
      const seamTop = PAD_TOP + target * BAND_H;
      const chamberTop = seamTop + SEAM_H;
      const worldH = chamberTop + CHAMBER_H;

      // Drill position: surface, mid-strata, or hovering at the seam.
      const drillTargetY =
        st === "surface"
          ? PAD_TOP
          : st === "sealing"
            ? seamTop + SEAM_H * 0.5
            : PAD_TOP + confs * BAND_H;
      drillYSmooth += (drillTargetY - drillYSmooth) * Math.min(1, dt * 2.2);

      // New confirmation → burst + reset crack anim.
      if (confs !== lastConfs) {
        if (lastConfs >= 0 && confs > lastConfs && !reduced) {
          spawnBurst(cssW / 2, PAD_TOP + confs * BAND_H, false, 14);
        }
        lastConfs = confs;
        breakProgress = 0;
      }
      breakProgress = Math.min(1, breakProgress + dt * 0.55);

      // Camera follows the drill, clamped to the world.
      const camTarget = Math.max(
        0,
        Math.min(drillYSmooth - cssH * 0.42, worldH - cssH),
      );
      cameraY += (camTarget - cameraY) * Math.min(1, dt * 2.0);
      if (reduced) cameraY = camTarget;

      const toScreen = (wy: number) => wy - cameraY;

      // ── paint ─────────────────────────────────────────────────────────
      ctx.clearRect(0, 0, cssW, cssH);

      // Rock backdrop, darkening with depth.
      const bg = ctx.createLinearGradient(0, 0, 0, cssH);
      const depthFrac = Math.min(1, cameraY / Math.max(1, worldH - cssH));
      bg.addColorStop(0, `hsl(240 8% ${13 - depthFrac * 5}%)`);
      bg.addColorStop(1, `hsl(240 10% ${9 - depthFrac * 4}%)`);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, cssW, cssH);

      // Surface sliver (sky) if visible.
      const surfScreen = toScreen(0);
      if (surfScreen > -PAD_TOP) {
        ctx.fillStyle = "#0b1020";
        ctx.fillRect(0, surfScreen, cssW, PAD_TOP);
        if (!inputRef.current.decorative) {
          ctx.fillStyle = "rgba(148, 163, 184, 0.5)";
          ctx.font = "700 9px ui-monospace, monospace";
          ctx.textAlign = "center";
          ctx.fillText("ETHEREUM SURFACE", cssW / 2, surfScreen + PAD_TOP - 8);
        }
      }

      const shaftL = cssW * 0.16;
      const shaftR = cssW * 0.84;

      // Gold chamber glow FIRST (under everything) so it bleeds upward.
      const glowStrength =
        st === "sealing" ? 1 : 0.25 + 0.75 * (confs / Math.max(1, target));
      const chamberScreen = toScreen(chamberTop);
      if (chamberScreen < cssH + CHAMBER_H) {
        const gy = Math.min(cssH + 40, chamberScreen + CHAMBER_H * 0.55);
        const glow = ctx.createRadialGradient(
          cssW / 2, gy, 6,
          cssW / 2, gy, CHAMBER_H * 1.4,
        );
        glow.addColorStop(0, `rgba(250, 204, 21, ${0.5 * glowStrength})`);
        glow.addColorStop(0.5, `rgba(202, 138, 4, ${0.22 * glowStrength})`);
        glow.addColorStop(1, "rgba(202, 138, 4, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, chamberScreen - CHAMBER_H, cssW, CHAMBER_H * 2.6);
        // Vein sparkles
        for (let i = 0; i < 7; i++) {
          const sx = shaftL + jitter(i * 3.7) * (shaftR - shaftL);
          const sy = chamberScreen + 14 + jitter(i * 9.1) * (CHAMBER_H - 40);
          const tw = reduced ? 0.6 : 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i * 1.9));
          ctx.fillStyle = `rgba(253, 224, 71, ${0.35 + 0.5 * tw * glowStrength})`;
          ctx.beginPath();
          ctx.arc(sx, sy, 1.6 + tw * 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Strata bands.
      for (let i = 0; i < target; i++) {
        const bandTop = PAD_TOP + i * BAND_H;
        const sy = toScreen(bandTop);
        if (sy > cssH || sy + BAND_H < 0) continue;
        const broken = i < confs;
        const active = i === confs && st === "confirming";
        const hue = 25 + jitter(i) * 14;
        const lit = broken ? 9 : 17 + jitter(i * 2.3) * 5;
        ctx.fillStyle = `hsl(${hue} ${broken ? 8 : 22}% ${lit}%)`;
        // Jagged band edges
        ctx.beginPath();
        ctx.moveTo(shaftL, sy);
        const steps = 7;
        for (let s = 0; s <= steps; s++) {
          const x = shaftL + ((shaftR - shaftL) * s) / steps;
          ctx.lineTo(x, sy + (jitter(i * 13 + s) - 0.5) * 7);
        }
        for (let s = steps; s >= 0; s--) {
          const x = shaftL + ((shaftR - shaftL) * s) / steps;
          ctx.lineTo(x, sy + BAND_H + (jitter(i * 17 + s) - 0.5) * 7);
        }
        ctx.closePath();
        ctx.fill();

        if (broken) {
          // Rubble marks on cleared strata.
          ctx.strokeStyle = "rgba(0,0,0,0.35)";
          ctx.lineWidth = 1;
          for (let r = 0; r < 4; r++) {
            const rx = shaftL + jitter(i * 31 + r) * (shaftR - shaftL);
            const ry = sy + 6 + jitter(i * 37 + r) * (BAND_H - 12);
            ctx.beginPath();
            ctx.moveTo(rx - 5, ry);
            ctx.lineTo(rx + 5, ry + 3);
            ctx.stroke();
          }
        }
        if (active) {
          // Crack lines radiating as the current stratum gives way.
          ctx.strokeStyle = `rgba(253, 224, 71, ${0.25 + 0.45 * breakProgress})`;
          ctx.lineWidth = 1.4;
          const cx = cssW / 2;
          const cy2 = sy + BAND_H * 0.35;
          for (let c = 0; c < 5; c++) {
            const ang = -Math.PI / 2 + (c - 2) * 0.5;
            const len = (10 + jitter(i * 7 + c) * 18) * breakProgress;
            ctx.beginPath();
            ctx.moveTo(cx, cy2);
            ctx.lineTo(cx + Math.cos(ang) * len, cy2 + Math.sin(ang) * len + len * 0.6);
            ctx.stroke();
          }
        }
        // Depth gauge: block numbers down the left wall. Suppressed in
        // decorative mode — see the `decorative` prop.
        if (!inputRef.current.decorative) {
          ctx.fillStyle = broken
            ? "rgba(163, 163, 163, 0.75)"
            : "rgba(113, 113, 122, 0.55)";
          ctx.font = "700 9px ui-monospace, monospace";
          ctx.textAlign = "right";
          ctx.fillText(`${i + 1}`, shaftL - 8, sy + BAND_H * 0.62);
          if (broken) {
            ctx.fillStyle = "rgba(52, 211, 153, 0.9)";
            ctx.fillText("✓", shaftL - 20, sy + BAND_H * 0.62);
          }
        }
      }

      // The chain-key seam — crystalline band between strata and gold.
      const seamScreen = toScreen(seamTop);
      if (seamScreen < cssH && seamScreen + SEAM_H > 0) {
        const pulse =
          st === "sealing" && !reduced
            ? 0.55 + 0.45 * Math.abs(Math.sin(t * 3))
            : 0.55;
        const seamGrad = ctx.createLinearGradient(0, seamScreen, 0, seamScreen + SEAM_H);
        seamGrad.addColorStop(0, `rgba(34, 211, 238, ${0.12 * pulse})`);
        seamGrad.addColorStop(0.5, `rgba(103, 232, 249, ${0.30 * pulse})`);
        seamGrad.addColorStop(1, `rgba(34, 211, 238, ${0.12 * pulse})`);
        ctx.fillStyle = seamGrad;
        ctx.fillRect(shaftL, seamScreen, shaftR - shaftL, SEAM_H);
        // Crystals
        for (let c = 0; c < 6; c++) {
          const cx = shaftL + 12 + jitter(c * 5.1) * (shaftR - shaftL - 24);
          const cy2 = seamScreen + SEAM_H * (0.3 + jitter(c * 8.3) * 0.4);
          ctx.fillStyle = `rgba(165, 243, 252, ${0.5 * pulse + 0.2})`;
          ctx.beginPath();
          ctx.moveTo(cx, cy2 - 6);
          ctx.lineTo(cx + 4, cy2);
          ctx.lineTo(cx, cy2 + 6);
          ctx.lineTo(cx - 4, cy2);
          ctx.closePath();
          ctx.fill();
        }
        if (!inputRef.current.decorative) {
          ctx.fillStyle = `rgba(165, 243, 252, ${0.75 * pulse + 0.2})`;
          ctx.font = "800 8px ui-monospace, monospace";
          ctx.textAlign = "center";
          ctx.fillText("CHAIN-KEY SEAM · ICP", cssW / 2, seamScreen + SEAM_H / 2 + 3);
        }
      }

      // Shaft walls (over bands, under drill).
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, shaftL, cssH);
      ctx.fillRect(shaftR, 0, cssW - shaftR, cssH);
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(shaftL, 0);
      ctx.lineTo(shaftL, cssH);
      ctx.moveTo(shaftR, 0);
      ctx.lineTo(shaftR, cssH);
      ctx.stroke();

      // The drill head — a taut cable + bit at the working depth.
      const dScreen = toScreen(drillYSmooth);
      ctx.strokeStyle = "rgba(212, 212, 216, 0.5)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cssW / 2, Math.min(dScreen, 0));
      ctx.lineTo(cssW / 2, dScreen - 8);
      ctx.stroke();
      const bob = reduced || st !== "confirming" ? 0 : Math.sin(t * 9) * 2.5;
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.moveTo(cssW / 2 - 7, dScreen - 8 + bob);
      ctx.lineTo(cssW / 2 + 7, dScreen - 8 + bob);
      ctx.lineTo(cssW / 2, dScreen + 6 + bob);
      ctx.closePath();
      ctx.fill();

      // Particles.
      if (!reduced) {
        for (const p of particles) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.05;
          p.life -= dt * 1.4;
        }
        particles = particles.filter((p) => p.life > 0);
        for (const p of particles) {
          ctx.fillStyle = p.gold
            ? `rgba(253, 224, 71, ${p.life})`
            : `rgba(168, 162, 158, ${p.life * 0.8})`;
          ctx.fillRect(p.x, toScreen(p.y), 2, 2);
        }
      }
    };

    // ── loop / static mode ─────────────────────────────────────────────
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      drawFrame(dt);
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      cancelAnimationFrame(raf);
      if (reduced) {
        // Static: settle camera instantly, draw once.
        drawFrame(1);
      } else {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };
    start();
    redrawRef.current = () => {
      if (reduced) drawFrame(1);
    };

    const onRmChange = (e: MediaQueryListEvent) => {
      reduced = e.matches;
      start();
    };
    rmQuery?.addEventListener?.("change", onRmChange);

    // Battery gate: on a low, discharging battery the loop drops to static
    // frames — decoration must never drain someone's last percent. One-shot
    // check; getBattery is Chromium-only and absent elsewhere (try/catch).
    try {
      (navigator as any).getBattery?.().then(
        (b: { level: number; charging: boolean }) => {
          if (b.level < 0.15 && !b.charging) {
            reduced = true;
            start();
          }
        },
      );
    } catch {
      /* no Battery API — keep animating */
    }

    // Backgrounded tab: stop the loop entirely (rAF is throttled but not
    // free, and time-based particles jump on return); resume + resync the
    // clock when visible again.
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else {
        start();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", onWinResize);
      document.removeEventListener("visibilitychange", onVisibility);
      rmQuery?.removeEventListener?.("change", onRmChange);
      redrawRef.current = null;
    };
  }, [height]);

  // In reduced-motion mode there is no animation loop, so redraw the static
  // frame whenever the inputs actually change (~once per 12 s block).
  useEffect(() => {
    redrawRef.current?.();
  }, [confirmations, stage]);

  return (
    <div ref={wrapRef} className="w-full">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Mine shaft progress: ${Math.min(confirmations, targetConfirmations)} of ${targetConfirmations} Ethereum blocks confirmed${stage === "sealing" ? "; at the chain-key seam, waiting for ckUNI to mint" : ""}`}
        className="block w-full rounded-2xl"
      />
    </div>
  );
}
