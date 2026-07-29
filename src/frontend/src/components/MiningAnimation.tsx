import { useEffect, useRef } from "react";
import { useTheme } from "../hooks/useTheme";

/**
 * MiningAnimation — single-canvas replacement for PixelAxeAnimation.
 *
 * The core idea: the animation IS the progress display. A rock boulder is
 * chipped away by the pickaxe as `progress` (0..1) rises — outer shell
 * carved off, gold revealed underneath — so by 100% the grey rock has
 * become a glinting gold nugget. No decorative loop next to a separate
 * progress bar; the ore state always reflects real bridge progress.
 *
 * Props:
 *  progress — 0..1 fraction of the deposit bridged (drives the ore reveal).
 *  success  — sGLDT released: nugget goes full gold, coin burst, emerald glow.
 *  pollPing — increment on each poll tick to trigger an immediate strike
 *             (otherwise the pickaxe swings on its own idle rhythm).
 *  scale    — CSS size multiplier for the 240×170 logical scene (default 0.75).
 *
 * One <canvas> element, one rAF loop, ~zero React re-renders during
 * animation (props are mirrored into a mutable state object). Honors
 * prefers-reduced-motion by freezing the pickaxe and skipping particles
 * while still rendering the current progress state.
 */

type SceneHandle = {
  setProgress: (p: number) => void;
  setTheme: (t: "dark" | "light") => void;
  strike: () => void;
  setSuccess: (v: boolean) => void;
  destroy: () => void;
};

type Particle = {
  x: number; y: number; vx: number; vy: number;
  g: number; life: number; age: number; sz: number; col: string;
};

type OreCell = {
  c: number; r: number; rockIdx: number; goldIdx: number;
  glintSeed: number; order: number; shell: boolean; isBase: boolean;
  chipAt: number;
};

const PAL = {
  dark: {
    rock: ["#4b5563", "#525b66", "#434b55", "#5a6470"],
    rockEdge: "#333a42",
    gold: ["#FFD700", "#FFE55C", "#F0B90B", "#DAA520"],
    goldGlint: "#FFF6C8",
    ground: ["#3a2c14", "#2c2110", "#22190b"],
    handle: ["#8B5A2B", "#6B4319"],
    steel: ["#c8ccd2", "#9aa0a8", "#e2e5ea", "#7d838c"],
    spark: ["#FFD700", "#FFE55C", "#FFF6C8", "#F0B90B"],
    chip: ["#6b7280", "#4b5563", "#9ca3af"],
    glow: "255,215,0",
    emerald: ["#34d399", "#10b981", "#6ee7b7"],
  },
  light: {
    rock: ["#94a3b8", "#a8b3c4", "#8593a6", "#b7c0cf"],
    rockEdge: "#64748b",
    gold: ["#D4A017", "#E4B93C", "#B8860B", "#9a7108"],
    goldGlint: "#F7E7A8",
    ground: ["#cbd5e1", "#dde5ee", "#eef2f7"],
    handle: ["#7c4a1e", "#5e3714"],
    steel: ["#8d939c", "#6d737c", "#b0b5bd", "#5a5f68"],
    spark: ["#D4A017", "#E4B93C", "#B8860B", "#F7E7A8"],
    chip: ["#94a3b8", "#64748b", "#cbd5e1"],
    glow: "184,134,11",
    emerald: ["#10b981", "#059669", "#34d399"],
  },
} as const;

function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createMiningScene(
  canvas: HTMLCanvasElement,
  opts: { theme: "dark" | "light"; scale: number },
): SceneHandle {
  const W = 240, H = 170;
  const PX = 6;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { setProgress() {}, setTheme() {}, strike() {}, setSuccess() {}, destroy() {} };
  const scale = opts.scale;
  const dpr = Math.max(1, window.devicePixelRatio || 1) * scale;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = `${W * scale}px`;
  canvas.style.height = `${H * scale}px`;

  const COLS = 11, ROWS = 8;
  const oreX = W / 2 - (COLS * PX) / 2 + 22;
  const oreY = H - 14 - ROWS * PX;
  let cells: OreCell[] = [];
  function buildOre() {
    const rng = mulberry32(1337);
    cells = [];
    const cx = (COLS - 1) / 2, cy = ROWS * 0.62;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const dx = (c - cx) / cx, dy = (r - cy) / cy;
        const d = dx * dx * 1.15 + dy * dy * 0.85;
        if (r < ROWS - 1 && d > 1.02 + rng() * 0.1) continue;
        const distFromCore = Math.sqrt(dx * dx + dy * dy);
        cells.push({
          c, r,
          rockIdx: (rng() * 4) | 0,
          goldIdx: (rng() * 4) | 0,
          glintSeed: rng() * Math.PI * 2,
          order: distFromCore + rng() * 0.55 - r * 0.02,
          // outermost shell is carved away entirely; inner cells reveal
          // gold — the boulder shrinks down to a glinting nugget core
          shell: distFromCore > 0.88,
          isBase: r === ROWS - 1,
          chipAt: 1,
        });
      }
    }
    const chippable = cells.filter((x) => !x.isBase);
    const sorted = [...chippable].sort((a, b) => b.order - a.order);
    sorted.forEach((cell, i) => { cell.chipAt = i / sorted.length; });
  }
  buildOre();

  const S = {
    theme: opts.theme,
    progress: 0,
    shownProgress: 0,
    success: false,
    reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    t: 0,
    swingPhase: 0,
    swingDur: 1.7,
    shake: 0,
    flash: 0,
    successT: -1,
    particles: [] as Particle[],
    motes: [] as { x: number; y: number; p: number; spd: number; sz: number }[],
  };
  {
    const rng = mulberry32(777);
    for (let i = 0; i < 9; i++) {
      S.motes.push({ x: rng() * W, y: H - 20 - rng() * 60, p: rng() * Math.PI * 2, spd: 0.4 + rng() * 0.5, sz: rng() > 0.5 ? 1.5 : 2.2 });
    }
  }

  function spawnBurst(x: number, y: number, n: number, colors: readonly string[], power: number, gravity: number, life: number) {
    if (S.reduced) return;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * (0.15 + Math.random() * 0.7);
      const v = power * (0.5 + Math.random() * 0.8);
      S.particles.push({
        x, y,
        vx: Math.cos(a) * v * (Math.random() > 0.5 ? 1 : -1),
        vy: Math.sin(a) * v,
        g: gravity, life, age: 0,
        sz: 1.5 + Math.random() * 2.5,
        col: colors[(Math.random() * colors.length) | 0],
      });
    }
  }

  function onImpact() {
    const P = PAL[S.theme];
    S.shake = 1;
    S.flash = 1;
    spawnBurst(oreX + 4, oreY + 18, 7, P.spark, 70, 160, 0.55);
    spawnBurst(oreX + 4, oreY + 18, 4, P.chip, 45, 300, 0.45);
  }

  function fireSuccess() {
    const P = PAL[S.theme];
    S.successT = 0;
    S.flash = 1.4;
    S.shake = 1.6;
    const x = oreX + (COLS * PX) / 2, y = oreY + (ROWS * PX) / 2;
    spawnBurst(x, y, 26, [...P.gold, P.goldGlint], 95, 130, 1.4);
    spawnBurst(x, y, 10, P.emerald, 70, 110, 1.2);
  }

  // Swing curve: slow anticipation raise, fast snap down, impact hold, recover.
  function swingAngle(phase: number) {
    const REST = -0.95, UP = -1.35, HIT = 0.42;
    if (phase < 0.42) {
      const t = phase / 0.42;
      return REST + (UP - REST) * (1 - (1 - t) ** 2);
    }
    if (phase < 0.55) {
      const t = (phase - 0.42) / 0.13;
      return UP + (HIT - UP) * t * t * t;
    }
    if (phase < 0.68) return HIT;
    const t = (phase - 0.68) / 0.32;
    const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
    return HIT + (REST - HIT) * e;
  }

  function drawAxeShape(P: (typeof PAL)["dark" | "light"]) {
    for (let i = 0; i < 8; i++) {
      ctx!.fillStyle = P.handle[i % 2];
      ctx!.fillRect(i * 5, -2.5, 5, 5);
    }
    const hx = 40;
    ctx!.save();
    ctx!.translate(hx, 0);
    ctx!.fillStyle = P.steel[3];
    ctx!.fillRect(-6, -6, 11, 12);
    ctx!.fillStyle = P.steel[1];
    ctx!.fillRect(-5, -5, 9, 10);
    ctx!.fillStyle = P.steel[1];
    ctx!.fillRect(-1, -12, 7, 24);
    ctx!.fillStyle = P.steel[0];
    ctx!.fillRect(0, -12, 5, 24);
    ctx!.fillStyle = P.steel[2];
    ctx!.fillRect(4, -12, 1.6, 24);
    const taper: Array<[number, number, number]> = [[5, 12, 4], [4, 15.5, 3.5], [2.8, 18.5, 3], [2, 21, 2.6]];
    for (const [w, off, h] of taper) {
      ctx!.fillStyle = P.steel[0];
      ctx!.fillRect(1, off, w, h);
      ctx!.fillRect(1, -off - h, w, h);
      ctx!.fillStyle = P.steel[2];
      ctx!.fillRect(1 + w - 1.1, off, 1.1, h);
      ctx!.fillRect(1 + w - 1.1, -off - h, 1.1, h);
    }
    ctx!.fillStyle = P.goldGlint;
    ctx!.fillRect(1.6, 22, 2.2, 2.2);
    ctx!.restore();
  }

  function drawPickaxe(P: (typeof PAL)["dark" | "light"], angle: number, blur: number) {
    // pivot floats up-left of the ore so the crescent's lower point lands
    // on the ore's upper-left face at the HIT angle (0.42 rad)
    const px = oreX - 26, py = oreY - 17;
    ctx!.save();
    ctx!.translate(px, py);
    ctx!.rotate(angle);
    if (blur > 0.02) {
      ctx!.save();
      ctx!.rotate(-blur * 1.6);
      ctx!.globalAlpha = 0.13;
      drawAxeShape(P);
      ctx!.restore();
      ctx!.globalAlpha = 1;
    }
    drawAxeShape(P);
    ctx!.restore();
  }

  function draw(dt: number) {
    const P = PAL[S.theme];
    S.t += dt;
    S.shownProgress += (S.progress - S.shownProgress) * Math.min(1, dt * 6);

    let impact = false;
    if (!S.success && !S.reduced) {
      const prev = S.swingPhase;
      S.swingPhase += dt / S.swingDur;
      if (S.swingPhase >= 1) S.swingPhase -= 1;
      if (prev < 0.55 && S.swingPhase >= 0.55) impact = true;
    }
    if (impact) onImpact();

    S.shake = Math.max(0, S.shake - dt * 5);
    S.flash = Math.max(0, S.flash - dt * 3);
    if (S.successT >= 0) S.successT += dt;

    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx!.clearRect(0, 0, W, H);
    ctx!.imageSmoothingEnabled = false;

    const shk = S.shake * S.shake;
    if (!S.reduced) {
      ctx!.translate((Math.random() - 0.5) * 4 * shk, (Math.random() - 0.5) * 3 * shk);
    }

    // ambient glow — brightens with progress, flash, success
    const gAmt = 0.18 + S.shownProgress * 0.4 + S.flash * 0.35 + (S.successT >= 0 ? 0.3 : 0);
    const gcol = S.successT >= 0 ? "52,211,153" : P.glow;
    const grad = ctx!.createRadialGradient(oreX + (COLS * PX) / 2, oreY + (ROWS * PX) / 2, 4, oreX + (COLS * PX) / 2, oreY + (ROWS * PX) / 2, 78);
    grad.addColorStop(0, `rgba(${gcol},${Math.min(0.8, gAmt)})`);
    grad.addColorStop(1, `rgba(${gcol},0)`);
    ctx!.fillStyle = grad;
    ctx!.fillRect(0, 0, W, H);

    // ground
    for (let i = 0; i < Math.ceil(W / 10); i++) {
      const h = i % 3 === 0 ? 8 : 6;
      ctx!.fillStyle = P.ground[i % 3];
      ctx!.fillRect(i * 10, H - h, 10, h);
    }

    // motes
    for (const m of S.motes) {
      m.p += dt * m.spd;
      const fy = Math.sin(m.p) * 9;
      ctx!.globalAlpha = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(m.p * 1.3));
      ctx!.fillStyle = S.successT >= 0 ? P.emerald[0] : P.gold[0];
      ctx!.fillRect(m.x, m.y + fy, m.sz, m.sz);
    }
    ctx!.globalAlpha = 1;

    // ore block — rock carved away to reveal a gold core
    const chip = S.successT >= 0 ? 1 : S.shownProgress;
    const wob = S.successT >= 0 && S.successT < 0.4 ? Math.sin(S.successT * 60) * 1.5 : 0;
    for (const cell of cells) {
      const x = oreX + cell.c * PX + wob * (cell.r % 2 ? 1 : -1) * 0.4;
      const y = oreY + cell.r * PX;
      const chipped = !cell.isBase && cell.chipAt < chip;
      if (cell.isBase) {
        ctx!.fillStyle = P.ground[0];
        ctx!.fillRect(x, y, PX, PX);
        continue;
      }
      if (chipped || S.successT >= 0) {
        if (cell.shell && S.successT < 0) continue; // carved away — gone
        const glint = 0.5 + 0.5 * Math.sin(S.t * 2.2 + cell.glintSeed);
        ctx!.fillStyle = P.gold[cell.goldIdx];
        ctx!.fillRect(x, y, PX, PX);
        if (glint > 0.82) {
          ctx!.fillStyle = P.goldGlint;
          ctx!.fillRect(x + 1, y + 1, 2, 2);
        }
      } else {
        ctx!.fillStyle = P.rock[cell.rockIdx];
        ctx!.fillRect(x, y, PX, PX);
        // near-chipping cells crack and let gold peek through
        if (cell.chipAt - chip < 0.08 && chip > 0.01) {
          ctx!.fillStyle = P.rockEdge;
          ctx!.fillRect(x + 1, y + 2, 4, 1);
          ctx!.fillRect(x + 3, y, 1, 3);
          ctx!.fillStyle = P.gold[cell.goldIdx];
          ctx!.globalAlpha = 0.35;
          ctx!.fillRect(x + 2, y + 3, 2, 2);
          ctx!.globalAlpha = 1;
        }
      }
    }

    // impact flash — soft radial, not a box
    if (S.flash > 0.03) {
      const fx = oreX + (COLS * PX) / 2, fy = oreY + (ROWS * PX) / 2;
      const fg = ctx!.createRadialGradient(fx, fy, 2, fx, fy, 42);
      fg.addColorStop(0, `rgba(255,255,255,${Math.min(0.5, S.flash * 0.32)})`);
      fg.addColorStop(1, "rgba(255,255,255,0)");
      ctx!.fillStyle = fg;
      ctx!.fillRect(fx - 44, fy - 44, 88, 88);
    }

    // pickaxe
    if (S.successT < 0) {
      const ang = S.reduced ? -0.95 : swingAngle(S.swingPhase);
      const prevAng = S.reduced ? -0.95 : swingAngle(Math.max(0, S.swingPhase - dt / S.swingDur));
      drawPickaxe(P, ang, Math.max(0, ang - prevAng));
    } else if (S.successT < 0.8) {
      drawPickaxe(P, 0.42, 0);
    }

    // particles
    for (let i = S.particles.length - 1; i >= 0; i--) {
      const p = S.particles[i];
      p.age += dt;
      if (p.age > p.life) { S.particles.splice(i, 1); continue; }
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.y > H - 6 && p.vy > 0) { p.y = H - 6; p.vy *= -0.45; p.vx *= 0.7; }
      const a = 1 - p.age / p.life;
      ctx!.globalAlpha = a;
      ctx!.fillStyle = p.col;
      const s = p.sz * (0.6 + a * 0.4);
      ctx!.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
    ctx!.globalAlpha = 1;
  }

  let raf = 0;
  let last = performance.now();
  let running = true;
  function frame(now: number) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    draw(dt);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  return {
    setProgress(p) { S.progress = Math.max(0, Math.min(1, p)); },
    setTheme(t) { S.theme = t; },
    strike() {
      if (!S.success && S.swingPhase < 0.42) S.swingPhase = 0.42;
    },
    setSuccess(v) {
      if (v && !S.success) { S.success = true; fireSuccess(); }
      if (!v && S.success) { S.success = false; S.successT = -1; buildOre(); }
    },
    destroy() { running = false; cancelAnimationFrame(raf); },
  };
}

export function MiningAnimation({
  progress = 0,
  success = false,
  pollPing,
  scale = 0.75,
}: {
  progress?: number;
  success?: boolean;
  pollPing?: number;
  scale?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<SceneHandle | null>(null);
  const prevPingRef = useRef(pollPing);
  const { theme } = useTheme();

  useEffect(() => {
    if (!canvasRef.current) return;
    const scene = createMiningScene(canvasRef.current, { theme, scale });
    sceneRef.current = scene;
    return () => {
      scene.destroy();
      sceneRef.current = null;
    };
    // scale is fixed per mount; theme handled by the effect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { sceneRef.current?.setTheme(theme); }, [theme]);
  useEffect(() => { sceneRef.current?.setProgress(progress); }, [progress]);
  useEffect(() => { sceneRef.current?.setSuccess(success); }, [success]);
  useEffect(() => {
    if (pollPing !== undefined && pollPing !== prevPingRef.current) {
      prevPingRef.current = pollPing;
      sceneRef.current?.strike();
    }
  }, [pollPing]);

  const ariaLabel = success
    ? "Gold mined. sGLDT has been released to your account."
    : progress > 0
      ? `Mining in progress — ${Math.round(progress * 100)} percent of your deposit bridged.`
      : "Mining in progress. Waiting for Ethereum confirmations.";

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={ariaLabel}
      className="select-none"
    />
  );
}
