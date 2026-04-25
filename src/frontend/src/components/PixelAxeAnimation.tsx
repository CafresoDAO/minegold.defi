import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "../hooks/useTheme";

/** Color palette for the scene — theme-aware so the same pixel art reads as
 *  "polished gold ore under warm spotlight" in dark mode and "refined gold
 *  nugget in a vitrine" on light mode. Hardcoded hex values live here in
 *  one place so they can be tuned without combing the DOM.
 *
 *  Dark-mode golds are fluorescent (#FFD700) because they fluoresce against
 *  #080808. On white they'd wash out — the light palette is DarkGoldenrod
 *  toned (#B8860B, #D4A94A) which reads as gold on both surfaces but stays
 *  readable without brightness artifacts. */
const PALETTES = {
  dark: {
    oreHighlight: "#FFE55C",
    oreMid: "#FFD700",
    oreShade: "#F5C542",
    oreDeep: "#DAA520",
    oreRock1: "#747474",
    oreRock2: "#6E6E6E",
    oreRock3: "#767676",
    baseRow1: "#5C4A28",
    baseRow2: "#6B5A30",
    spark1: "#FFD700",
    spark2: "#FFE55C",
    spark3: "#F5C542",
    spark4: "#FFF8B0",
    spark5: "#DAA520",
    stoneChip1: "#909090",
    stoneChip2: "#808080",
    stoneChip3: "#707070",
    stoneChip4: "#888888",
    stoneChip5: "#969696",
    mote: "#FFD700",
    glowFrom: "rgba(255,215,0,0.45)",
    glowVia: "rgba(255,215,0,0.12)",
    xpColor: "#FFD700",
    xpRareColor: "#FF7F50",
    xpShadowFrom: "rgba(255,215,0,0.8)",
    xpShadowBlack: "#000",
    groundColors: ["#4A3010", "#3A2410", "#2A1A08"],
    handleLight: "#8B4513",
    handleDark: "#6B3410",
    handleAccent: "#7B3F10",
  },
  light: {
    /* Refined gold on light: deeper, less fluorescent, more "polished
     *  metal" than "highlighter." DarkGoldenrod family reads as gold on
     *  white where neon-yellow would look plastic. */
    oreHighlight: "#E8C669",
    oreMid: "#D4A94A",
    oreShade: "#B8860B",
    oreDeep: "#8B6508",
    oreRock1: "#C8CDD6",
    oreRock2: "#BCC2CC",
    oreRock3: "#D2D7DF",
    baseRow1: "#8B6A2B",
    baseRow2: "#6F5421",
    spark1: "#B8860B",
    spark2: "#D4A94A",
    spark3: "#E8C669",
    spark4: "#F4D98A",
    spark5: "#8B6508",
    stoneChip1: "#64748B",
    stoneChip2: "#94A3B8",
    stoneChip3: "#475569",
    stoneChip4: "#CBD5E1",
    stoneChip5: "#A1AAB8",
    mote: "#B8860B",
    glowFrom: "rgba(184,134,11,0.28)",
    glowVia: "rgba(184,134,11,0.08)",
    xpColor: "#8B6508",
    xpRareColor: "#C2410C",
    xpShadowFrom: "rgba(184,134,11,0.3)",
    xpShadowBlack: "rgba(11, 30, 59, 0.35)",
    groundColors: ["#CBD5E1", "#E2E8F0", "#F1F5F9"],
    handleLight: "#78350F",
    handleDark: "#5C2A07",
    handleAccent: "#6B3510",
  },
} as const;

/** Props:
 *  label    — status text shown below the scene
 *  pollPing — increment this every time a poll fires; each increment triggers one
 *             synchronized pickaxe strike so the animation beats with the 3-s poll cycle.
 *  success  — set true when sGLDT is confirmed released; ore turns emerald green,
 *             coins burst out, and a GOLD MINED! float-up fires.
 *
 *  XP DROPS — there is at most ONE XP label on screen at any time. A new strike
 *  replaces the previous label rather than stacking on top, which was the source
 *  of the "words overlapped on one another" visual bug. The label lives ~900 ms
 *  so it always fades before the next swing can spawn a replacement. On success,
 *  we clear all in-flight drops first before rendering "GOLD MINED!" so the two
 *  never coexist.
 */
export function PixelAxeAnimation({
  label = "Mining sGLDT from treasury...",
  pollPing,
  success = false,
  compact = false,
}: {
  label?: string;
  pollPing?: number;
  success?: boolean;
  /** When true, hides the "Strikes: NNN · Lv.99 Mining" arcade HUD and the
   *  status label below the scene. Use this during the monitoring phase
   *  where the ckUNI bridge-progress bar is the primary status signal —
   *  the animation plays a decorative, subordinate role rather than being
   *  the hero element. Full mode (compact=false) is reserved for idle
   *  hover and success payoff where the arcade flavor is earned. */
  compact?: boolean;
}) {
  const { theme } = useTheme();
  const palette = PALETTES[theme];
  const [swing, setSwing] = useState(0);
  const [spark, setSpark] = useState(false);
  const [blockShake, setBlockShake] = useState(false);
  const [hitCount, setHitCount] = useState(0);
  // xpDrops is a SINGLE-SLOT array: [] or [drop]. Using an array instead of a
  // lone object keeps the existing render map() API, but the "stack" semantics
  // are gone — a new strike atomically replaces the previous label.
  const [xpDrops, setXpDrops] = useState<
    { id: number; amount: number; rare: boolean; x: number }[]
  >([]);
  const [victoryCoins, setVictoryCoins] = useState(false);
  const xpIdRef = useRef(0);
  const xpFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track previous pollPing so we only react to actual increments
  const prevPollRef = useRef<number | undefined>(pollPing);
  // Block idle auto-swing when we're in poll-sync mode
  const hasPollProp = pollPing !== undefined;

  /** Spawn a fresh XP drop, evicting any currently-visible one.
   *  Also cancels the pending fade timer so two rapidly-arriving drops
   *  don't have their fade windows race. */
  const spawnXpDrop = (rare: boolean, amount: number) => {
    if (xpFadeTimerRef.current) {
      clearTimeout(xpFadeTimerRef.current);
      xpFadeTimerRef.current = null;
    }
    const id = xpIdRef.current++;
    // Wider horizontal jitter (±32px) keeps consecutive drops from landing in
    // the same spot visually, without pushing them off the 170px scene.
    const x = Math.floor(Math.random() * 64) - 32;
    setXpDrops([{ id, amount, rare, x }]);
    xpFadeTimerRef.current = setTimeout(() => {
      setXpDrops((prev) => prev.filter((d) => d.id !== id));
      xpFadeTimerRef.current = null;
    }, 900);
  };

  // ── Idle background animation (runs when NOT in poll-sync mode) ──────────
  useEffect(() => {
    if (hasPollProp || success) return; // poll-sync or success takes over
    const sequence = [
      { delay: 0, fn: () => setSwing(0) },
      { delay: 280, fn: () => setSwing(1) },
      {
        delay: 490,
        fn: () => {
          setSwing(2);
          setSpark(true);
          setBlockShake(true);
          setHitCount((n) => n + 1);
          const rare = Math.random() < 0.125;
          const amount = rare
            ? 55 + Math.floor(Math.random() * 45)
            : 5 + Math.floor(Math.random() * 15);
          spawnXpDrop(rare, amount);
        },
      },
      { delay: 700, fn: () => { setSpark(false); setBlockShake(false); setSwing(3); } },
    ];
    let timers: ReturnType<typeof setTimeout>[] = [];
    const loop = () => {
      timers = sequence.map(({ delay, fn }) => setTimeout(fn, delay));
      timers.push(setTimeout(loop, 1100));
    };
    loop();
    return () => timers.forEach(clearTimeout);
  }, [hasPollProp, success]);

  // ── Poll-sync strike — fires each time pollPing increments ───────────────
  useEffect(() => {
    if (!hasPollProp || success) return;
    if (prevPollRef.current === pollPing) return; // same value, skip
    prevPollRef.current = pollPing;

    // Immediate: swing to impact
    setSwing(1);
    const t1 = setTimeout(() => {
      setSwing(2);
      setSpark(true);
      setBlockShake(true);
      setHitCount((n) => n + 1);
      const rare = Math.random() < 0.2; // slightly more rare XP in poll-sync mode
      const amount = rare
        ? 60 + Math.floor(Math.random() * 40)
        : 8 + Math.floor(Math.random() * 12);
      spawnXpDrop(rare, amount);
    }, 150);
    const t2 = setTimeout(() => { setSpark(false); setBlockShake(false); setSwing(3); }, 380);
    const t3 = setTimeout(() => setSwing(0), 700); // raise again, wait for next poll
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [pollPing, hasPollProp, success]);

  // ── Victory sequence — fires when success transitions to true ─────────────
  useEffect(() => {
    if (!success) return;
    // Cancel any in-flight XP label first so "GOLD MINED" never renders on
    // top of a lingering "+XP" from the last strike.
    if (xpFadeTimerRef.current) {
      clearTimeout(xpFadeTimerRef.current);
      xpFadeTimerRef.current = null;
    }
    setXpDrops([]);
    setSwing(2); // hold impact pose
    setSpark(true);
    setVictoryCoins(true);
    // Drop a big "GOLD MINED" label, anchored — no jitter so it sits exactly
    // where the user expects the payoff to land.
    const id = xpIdRef.current++;
    setXpDrops([{ id, amount: 9999, rare: true, x: 0 }]);
    const t1 = setTimeout(() => setSpark(false), 800);
    const t2 = setTimeout(() => setVictoryCoins(false), 2000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [success]);

  // Safety-net cleanup for the XP fade timer on unmount
  useEffect(() => {
    return () => {
      if (xpFadeTimerRef.current) clearTimeout(xpFadeTimerRef.current);
    };
  }, []);

  const rotationDeg = [-58, -18, 14, -48][swing] ?? -58;
  const crackStage = success ? 0 : hitCount % 4; // reset cracks on success

  const motes = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => ({
        id: i,
        left: 8 + Math.random() * 84,
        delay: Math.random() * 2.5,
        duration: 1.8 + Math.random() * 1.8,
        size: Math.random() > 0.5 ? 2 : 3,
      })),
    [],
  );

  // Spark burst (mining hits) — radial fan of warm-gold shards, sized and
  // angled to feel like chips flying off the ore. Kept to 12 particles per
  // strike so the visual punch lands without turning into confetti.
  const goldSparks = [
    { x: -16, y: -22, c: palette.spark1, s: 5 },
    { x: 16, y: -22, c: palette.spark2, s: 4 },
    { x: -24, y: -10, c: palette.spark3, s: 3 },
    { x: 24, y: -10, c: palette.spark1, s: 4 },
    { x: -10, y: -30, c: palette.spark4, s: 3 },
    { x: 10, y: -30, c: palette.spark1, s: 3 },
    { x: 0, y: -36, c: palette.spark2, s: 5 },
    { x: -30, y: -16, c: palette.spark5, s: 3 },
    { x: 30, y: -16, c: palette.spark5, s: 3 },
    { x: -5, y: -38, c: palette.spark2, s: 4 },
    { x: 5, y: -38, c: palette.spark1, s: 3 },
    { x: 20, y: -28, c: palette.spark3, s: 3 },
  ];
  const stoneChips = [
    { x: -22, y: -14, c: palette.stoneChip1 },
    { x: 20, y: -18, c: palette.stoneChip2 },
    { x: -8, y: -20, c: palette.stoneChip3 },
    { x: 14, y: -12, c: palette.stoneChip4 },
    { x: -18, y: -8, c: palette.stoneChip5 },
  ];
  // Victory burst — bigger, higher-arc eruption on success, mixed with the
  // emerald success flecks (kept cross-theme — emerald reads well on both).
  const victoryBurst = [
    { x: -28, y: -40, c: palette.spark1, s: 6 },
    { x: 28, y: -40, c: palette.spark2, s: 5 },
    { x: -40, y: -20, c: palette.spark3, s: 5 },
    { x: 40, y: -20, c: palette.spark1, s: 6 },
    { x: 0, y: -50, c: palette.spark4, s: 7 },
    { x: -18, y: -46, c: palette.spark1, s: 4 },
    { x: 18, y: -46, c: palette.spark2, s: 4 },
    { x: -44, y: -8, c: palette.spark5, s: 4 },
    { x: 44, y: -8, c: palette.spark5, s: 4 },
    { x: -22, y: -52, c: palette.spark1, s: 5 },
    { x: 22, y: -52, c: palette.spark4, s: 5 },
    { x: 0, y: -58, c: palette.spark2, s: 6 },
    // Emerald flecks — same on both themes (emerald-500/600 reads well on
    // both dark and light backgrounds)
    { x: -34, y: -34, c: "#2ecc71", s: 4 },
    { x: 34, y: -34, c: "#27ae60", s: 4 },
    { x: -10, y: -56, c: "#a8e6cf", s: 3 },
    { x: 10, y: -56, c: "#2ecc71", s: 3 },
  ];

  // Ore pixel grid — gold/rock when mining, emerald when success. Uses
  // palette tokens so the same grid reads as "buried gold ore in a dark
  // cavern" under dark mode and "polished nugget in a display case" on
  // the light palette, without any JSX change between themes.
  const oreRows: string[][] = success
    ? [
        ["#2ecc71", "#27ae60", "#2ecc71", "#1abc9c", "#2ecc71", "#27ae60", "#1abc9c", "#2ecc71", "#27ae60"],
        ["#27ae60", "#a8e6cf", "#2ecc71", "#27ae60", "#1abc9c", "#2ecc71", "#27ae60", "#a8e6cf", "#2ecc71"],
        ["#1abc9c", "#2ecc71", "#a8e6cf", "#2ecc71", "#27ae60", "#1abc9c", "#2ecc71", "#27ae60", "#1abc9c"],
        ["#2ecc71", "#1abc9c", "#27ae60", "#2ecc71", "#a8e6cf", "#2ecc71", "#1abc9c", "#2ecc71", "#27ae60"],
        ["#27ae60", "#2ecc71", "#1abc9c", "#27ae60", "#2ecc71", "#27ae60", "#2ecc71", "#1abc9c", "#27ae60"],
        ["#1abc9c", "#27ae60", "#2ecc71", "#1abc9c", "#27ae60", "#2ecc71", "#1abc9c", "#27ae60", "#1abc9c"],
        ["#145a32", "#1e8449", "#145a32", "#1e8449", "#145a32", "#1e8449", "#145a32", "#1e8449", "#145a32"],
      ]
    : [
        [palette.oreRock1, palette.oreMid,    palette.oreShade, palette.oreMid,    palette.oreRock2, palette.oreHighlight, palette.oreMid,    palette.oreShade, palette.oreRock3],
        [palette.oreMid,    palette.oreHighlight, palette.oreRock2, palette.oreMid,    palette.oreShade, palette.oreRock2,     palette.oreShade, palette.oreMid,    palette.oreMid],
        [palette.oreShade,  palette.oreRock3,     palette.oreHighlight, palette.oreShade, palette.oreRock1, palette.oreMid,        palette.oreRock2, palette.oreShade, palette.oreDeep],
        [palette.oreRock2,  palette.oreDeep,      palette.oreMid,    palette.oreRock2, palette.oreHighlight, palette.oreShade,  palette.oreMid,    palette.oreRock2, palette.oreShade],
        [palette.oreMid,    palette.oreShade,     palette.oreRock2, palette.oreMid,    palette.oreShade, palette.oreRock1,      palette.oreDeep,  palette.oreMid,    palette.oreRock2],
        [palette.oreDeep,   palette.oreRock1,     palette.oreShade, palette.oreDeep,  palette.oreRock2, palette.oreMid,        palette.oreShade, palette.oreRock1, palette.oreDeep],
        [palette.baseRow1,  palette.baseRow2,     palette.baseRow1, palette.baseRow2, palette.baseRow1, palette.baseRow2,      palette.baseRow1, palette.baseRow2, palette.baseRow1],
      ];

  // Live aria-label for screen readers — narrates the current state so a
  // user who can't see the pixel art still understands what's happening.
  const ariaLabel = success
    ? "Gold mined. sGLDT has been released to your account."
    : hasPollProp
      ? "Mining in progress. Your UNI deposit is being bridged to ICP."
      : "Mining animation playing while your deposit is processed.";

  return (
    <div
      className="flex flex-col items-center gap-2 py-2 select-none"
      role="img"
      aria-label={ariaLabel}
    >
      {/* Hit counter / success banner — hidden in compact mode so the arcade
       *  HUD doesn't compete with the technical dashboard during the long
       *  monitoring phase. Shown on idle hover (flavor) and on success
       *  (earned payoff). */}
      {!compact &&
        (success ? (
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-emerald-400 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-400" aria-hidden />
            <span className="font-black">Gold Mined!</span>
            <span className="text-emerald-400/50">·</span>
            <span>sGLDT Released</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.2em] text-yellow-500">
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: palette.oreMid }}
              aria-hidden
            />
            <span>Strikes: {hitCount.toString().padStart(3, "0")}</span>
            <span className="opacity-50">·</span>
            <span className="opacity-80">
              {hasPollProp ? "Synced to chain" : "Lv.99 Mining"}
            </span>
          </div>
        ))}

      {/* Scene — 170×150. The background carries a subtle inset wash so the
       *  silver pickaxe head reads cleanly on both themes. On dark mode it's
       *  a faint void gradient; on light, a warm amber cavern tint so the
       *  pixel art looks embedded in a "mining chamber" rather than floating
       *  on the page. */}
      <div
        data-pixel-scene
        className={`relative w-[170px] h-[150px] flex items-end justify-center overflow-visible transition-transform duration-75 rounded-2xl ${blockShake ? "translate-x-[2px]" : ""}`}
        style={{
          background:
            theme === "light"
              ? "radial-gradient(ellipse at 50% 70%, rgba(139, 101, 8, 0.10) 0%, rgba(71, 85, 105, 0.08) 60%, transparent 100%)"
              : "radial-gradient(ellipse at 50% 70%, rgba(0, 0, 0, 0.35) 0%, transparent 75%)",
        }}
      >
        {/* Radial glow — gold normally, emerald on success */}
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: 6,
            left: "50%",
            transform: "translateX(-50%)",
            width: 110,
            height: 100,
            background: success
              ? "radial-gradient(ellipse, rgba(46,204,113,0.6) 0%, rgba(39,174,96,0.18) 45%, transparent 72%)"
              : `radial-gradient(ellipse, ${palette.glowFrom} 0%, ${palette.glowVia} 45%, transparent 72%)`,
            transition: "background 600ms, opacity 100ms, filter 100ms",
            opacity: success ? 1 : spark ? 1 : 0.45,
            filter: success ? "brightness(1.4)" : spark ? "brightness(1.7)" : "brightness(1)",
          }}
        />

        {/* Ambient motes — green on success, gold otherwise */}
        {motes.map((m) => (
          <div
            key={m.id}
            className="absolute pointer-events-none"
            style={{
              bottom: 14,
              left: `${m.left}%`,
              width: m.size,
              height: m.size,
              background: success ? "#2ecc71" : palette.mote,
              imageRendering: "pixelated",
              animation: `moteFloat ${m.duration}s ease-in-out ${m.delay}s infinite`,
              boxShadow: success
                ? "0 0 4px rgba(46,204,113,0.9)"
                : `0 0 4px ${palette.glowFrom}`,
            }}
          />
        ))}

        {/* Pickaxe */}
        <div
          className="absolute"
          style={{
            bottom: 36,
            left: 12,
            transformOrigin: "100% 100%",
            transform: `rotate(${rotationDeg}deg)`,
            transition:
              swing === 2
                ? "transform 120ms cubic-bezier(0.25,0.46,0.45,0.94)"
                : "transform 200ms ease-out",
          }}
        >
          <div className="flex flex-col items-center gap-0">
            {[...Array(9)].map((_, i) => (
              <div
                key={`h${i}`}
                style={{
                  width: 5,
                  height: 5,
                  background:
                    i % 2 === 0
                      ? i < 3
                        ? palette.handleAccent
                        : palette.handleLight
                      : palette.handleDark,
                  imageRendering: "pixelated",
                }}
              />
            ))}
            <svg
              width="46"
              height="28"
              viewBox="0 0 46 28"
              style={{ marginTop: -2, imageRendering: "pixelated", overflow: "visible" }}
            >
              <rect x="18" y="16" width="10" height="10" fill="#999999" />
              <rect x="19" y="17" width="8" height="8" fill="#B0B0B0" />
              <rect x="2" y="12" width="42" height="8" fill="#C0C0C0" />
              <rect x="2" y="12" width="42" height="2" fill="#D8D8D8" />
              <rect x="2" y="18" width="42" height="2" fill="#A0A0A0" />
              <rect x="0" y="13" width="6" height="6" fill="#B8B8B8" />
              <rect x="0" y="14" width="3" height="4" fill="#C8C8C8" />
              <rect x="0" y="15" width="1" height="2" fill="#E0E0E0" />
              <rect x="40" y="13" width="6" height="6" fill="#ABABAB" />
              <rect x="43" y="14" width="3" height="4" fill="#989898" />
              <rect x="45" y="15" width="1" height="2" fill="#909090" />
              <rect x="6" y="10" width="30" height="2" fill="#C8C8C8" />
              <rect x="10" y="8" width="20" height="2" fill="#B8B8B8" />
              <rect x="6" y="20" width="30" height="2" fill="#A8A8A8" />
              <rect x="10" y="22" width="18" height="2" fill="#989898" />
              {(spark || success) && (
                <>
                  <rect x="0" y="14" width="3" height="4" fill={success ? "#2ecc71" : palette.oreMid} opacity="0.9" />
                  <rect x="0" y="15" width="2" height="2" fill="#FFFFFF" opacity="0.7" />
                </>
              )}
              <rect x="14" y="12" width="2" height="2" fill="#ECECEC" opacity="0.8" />
            </svg>
          </div>
        </div>

        {/* Ground — tonally shifted to match the ore's earth palette. On
         *  light mode it's a clean soft-slate band; on dark it stays the
         *  rich mine-floor umber. */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-center" style={{ height: 10 }}>
          {[...Array(17)].map((_, i) => (
            <div
              key={`g${i}`}
              style={{
                width: 10,
                height: i % 3 === 0 ? 8 : 6,
                background:
                  i % 2 === 0
                    ? i % 5 === 0
                      ? palette.groundColors[0]
                      : palette.groundColors[1]
                    : palette.groundColors[2],
                imageRendering: "pixelated",
                alignSelf: "flex-end",
              }}
            />
          ))}
        </div>

        {/* Gold Ore Block — green when success */}
        <div
          className={`absolute left-1/2 transition-all duration-500 ${
            blockShake ? "translate-x-[3px] -translate-y-[2px]" : "-translate-x-1/2"
          }`}
          style={{
            bottom: 8,
            filter: success ? "drop-shadow(0 0 8px rgba(46,204,113,0.8))" : undefined,
          }}
        >
          {oreRows.map((row, rIdx) => (
            <div key={`row${rIdx}`} className="flex flex-row gap-0">
              {row.map((c, cIdx) => (
                <div
                  key={`p${rIdx}${cIdx}`}
                  style={{
                    width: 6,
                    height: 6,
                    background: c,
                    imageRendering: "pixelated",
                    transition: "background 500ms",
                    boxShadow:
                      success && rIdx < 3
                        ? "0 0 2px rgba(46,204,113,0.5)"
                        : spark && rIdx < 2 && cIdx > 3 && cIdx < 7
                          ? "0 0 2px rgba(255,255,255,0.6)"
                          : undefined,
                  }}
                />
              ))}
            </div>
          ))}

          {/* Crack overlays — only while mining */}
          {!success && crackStage >= 1 && (
            <div className="absolute top-0 left-0 pointer-events-none" style={{
              width: 54, height: 42, opacity: 0.85,
              backgroundImage: `
                linear-gradient(52deg, transparent 42%, #1a0a00 43%, #1a0a00 45%, transparent 46%),
                linear-gradient(-35deg, transparent 58%, #1a0a00 59%, #1a0a00 61%, transparent 62%)
              `,
              mixBlendMode: "multiply",
            }} />
          )}
          {!success && crackStage >= 2 && (
            <div className="absolute top-2 left-4 pointer-events-none" style={{
              width: 34, height: 22, opacity: 0.75,
              backgroundImage: `linear-gradient(115deg, transparent 38%, #1a0a00 39%, #1a0a00 42%, transparent 43%)`,
              mixBlendMode: "multiply",
            }} />
          )}
          {!success && crackStage >= 3 && (
            <div className="absolute top-1 left-6 pointer-events-none" style={{
              width: 24, height: 36, opacity: 0.65,
              backgroundImage: `linear-gradient(80deg, transparent 45%, #1a0a00 46%, #1a0a00 49%, transparent 50%)`,
              mixBlendMode: "multiply",
            }} />
          )}
        </div>

        {/* Normal spark burst (mining) */}
        {spark && !success && (
          <>
            {goldSparks.map((s, i) => (
              <div key={`sp${i}`} className="absolute pointer-events-none" style={{
                bottom: 34, left: "50%",
                width: s.s, height: s.s, background: s.c,
                imageRendering: "pixelated",
                boxShadow: `0 0 5px ${s.c}`,
                animation: "sparkFly 0.55s ease-out forwards",
                "--sx": `${s.x}px`, "--sy": `${s.y}px`,
              } as React.CSSProperties} />
            ))}
            {stoneChips.map((c, i) => (
              <div key={`chip${i}`} className="absolute pointer-events-none" style={{
                bottom: 34, left: "50%",
                width: 3, height: 3, background: c.c,
                imageRendering: "pixelated",
                animation: "sparkFly 0.45s ease-out forwards",
                "--sx": `${c.x}px`, "--sy": `${c.y}px`,
              } as React.CSSProperties} />
            ))}
          </>
        )}

        {/* Victory coin burst (success) */}
        {victoryCoins && (
          <>
            {victoryBurst.map((s, i) => (
              <div key={`vc${i}`} className="absolute pointer-events-none" style={{
                bottom: 34, left: "50%",
                width: s.s, height: s.s, background: s.c,
                imageRendering: "pixelated",
                borderRadius: "50%",
                boxShadow: `0 0 8px ${s.c}`,
                animation: "victoryCoin 1.2s ease-out forwards",
                "--sx": `${s.x}px`, "--sy": `${s.y}px`,
              } as React.CSSProperties} />
            ))}
          </>
        )}

        {/* XP drops */}
        {xpDrops.map((drop) => (
          <div
            key={drop.id}
            className="absolute pointer-events-none font-mono font-black select-none"
            style={{
              bottom: drop.amount > 100 ? 55 : 48,
              left: `calc(50% + ${drop.x - 22}px)`,
              color: success ? "#2ecc71" : drop.rare ? palette.xpRareColor : palette.xpColor,
              fontSize: success ? 14 : drop.rare ? 13 : 10,
              textShadow: success
                ? `0 0 8px #2ecc71, 0 1px 0 ${palette.xpShadowBlack}`
                : drop.rare
                  ? `0 0 6px ${palette.xpRareColor}, 0 1px 0 ${palette.xpShadowBlack}`
                  : `0 1px 0 ${palette.xpShadowBlack}, 0 0 4px ${palette.xpShadowFrom}`,
              animation: success
                ? "xpRise 1.9s cubic-bezier(0.22,1,0.36,1) forwards"
                : "xpRise 0.9s cubic-bezier(0.22,1,0.36,1) forwards",
              whiteSpace: "nowrap",
              letterSpacing: "0.5px",
              willChange: "transform, opacity",
            }}
          >
            {success ? "⛏ GOLD MINED!" : drop.rare ? `★ ${drop.amount} XP` : `+${drop.amount} XP`}
          </div>
        ))}
      </div>

      {/* Status label — hidden in compact mode; the bridge progress card
       *  upstream carries the status now and we don't need to double-state. */}
      {!compact && (
        <p
          className={`text-[11px] font-mono tracking-[0.15em] text-center px-2 uppercase transition-colors duration-500 ${
            success ? "text-emerald-400 font-black animate-pulse" : "text-yellow-400/90"
          }`}
        >
          {success ? "sGLDT Released to Your Account" : label || "⛏ Mining in progress"}
        </p>
      )}

      <style>{`
        @keyframes sparkFly {
          0%   { opacity: 1; transform: translate(-50%, 0) scale(1); }
          60%  { opacity: 0.8; }
          100% { opacity: 0; transform: translate(calc(-50% + var(--sx, 10px)), var(--sy, -16px)) scale(0.15); }
        }
        @keyframes victoryCoin {
          0%   { opacity: 1; transform: translate(-50%, 0) scale(1.2); }
          40%  { opacity: 1; }
          100% { opacity: 0; transform: translate(calc(-50% + var(--sx, 10px)), var(--sy, -20px)) scale(0.3); }
        }
        @keyframes xpRise {
          0%   { opacity: 0; transform: translateY(6px) scale(0.7); }
          15%  { opacity: 1; transform: translateY(0) scale(1.2); }
          30%  { transform: translateY(-4px) scale(1); }
          100% { opacity: 0; transform: translateY(-40px) scale(0.9); }
        }
        @keyframes moteFloat {
          0%, 100% { opacity: 0.25; transform: translateY(0); }
          50%       { opacity: 0.95; transform: translateY(-18px); }
        }
        @media (prefers-reduced-motion: reduce) {
          /* Respect vestibular sensitivity: show the same scene but stop
             moving. The success "Gold Mined" banner still appears because
             it's an element swap, not an animation. */
          [data-pixel-scene] *,
          [data-pixel-scene] *::before,
          [data-pixel-scene] *::after {
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.001ms !important;
          }
        }
      `}</style>
    </div>
  );
}
