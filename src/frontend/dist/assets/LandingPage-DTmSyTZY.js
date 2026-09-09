import { r as reactExports, j as jsxRuntimeExports, E as useProofSnapshot, F as formatTokenAmount, G as CANISTERS, H as DASHBOARD, I as ExternalLink, J as IncidentBanner, T as ThemeToggle, y as ChevronRight, K as JOURNEY } from "./index-DuCrrQdW.js";
import { f as fetchCkBatStatus } from "./ckMinter-DL3tY3-z.js";
import { A as ArrowRight } from "./arrow-right-BustV5Ph.js";
function Reveal({
  children,
  delayMs = 0,
  className = ""
}) {
  const ref = reactExports.useRef(null);
  const [shown, setShown] = reactExports.useState(() => {
    if (typeof window === "undefined") return true;
    return !("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  reactExports.useEffect(() => {
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
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      ref,
      className,
      style: {
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : "translateY(14px)",
        transition: `opacity 600ms var(--ease-settle) ${delayMs}ms, transform 600ms var(--ease-settle) ${delayMs}ms`
      },
      children
    }
  );
}
function ProofBand({ onOpenProof }) {
  const { data: snap, isLoading } = useProofSnapshot(true);
  const balances = (snap == null ? void 0 : snap.balances) ?? null;
  const stranded = (snap == null ? void 0 : snap.stranded) ? snap.stranded.refines + snap.stranded.redeems : null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "section",
    {
      "data-ocid": "landing.proof_band",
      className: "rounded-[2rem] border p-6 sm:p-8",
      style: {
        borderColor: "var(--bb-border)",
        background: "var(--bb-surface)"
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "t-display", style: { fontSize: "clamp(1.75rem, 1.4rem + 1.6vw, 2.5rem)" }, children: "Verify it." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "p",
          {
            className: "mt-1 mb-5 text-sm max-w-2xl",
            style: { color: "var(--bb-text-muted)" },
            children: "Live reads from public ledgers — don't take our word for it."
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Figure,
            {
              label: "Treasury sGLDT (pays refines)",
              value: balances ? formatTokenAmount(balances.sgldtBalance) : isLoading ? "…" : "—"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Figure,
            {
              label: "Treasury ckUNI (pays cash-outs)",
              value: balances ? formatTokenAmount(balances.ckUNIBalance, 18) : isLoading ? "…" : "—"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Figure,
            {
              label: "Swaps held for manual resolution",
              value: stranded != null ? stranded.toString() : isLoading ? "…" : "—",
              note: "published even at 0"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "t-label mb-2", style: { color: "var(--bb-text-dim)" }, children: "Every canister in the money path — and who controls it" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mb-5 grid gap-1.5 sm:grid-cols-2", children: CANISTERS.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "text-[11px] leading-relaxed", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "a",
            {
              href: `${DASHBOARD}/${c.id}`,
              target: "_blank",
              rel: "noopener noreferrer",
              className: "inline-flex items-center gap-1 font-mono underline underline-offset-2",
              style: { color: "var(--bb-brand)" },
              children: [
                c.id.slice(0, 14),
                "… ",
                /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { size: 10 })
              ]
            }
          ),
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "var(--bb-text)" }, children: c.label }),
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { color: "var(--bb-text-dim)" }, children: [
            "(",
            c.party,
            ")"
          ] })
        ] }, c.id)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "rounded-2xl border p-4 text-[12px] leading-relaxed",
            style: {
              borderColor: "var(--bb-border)",
              background: "var(--bb-bg-soft)",
              color: "var(--bb-text-muted)"
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "t-label mb-1.5", style: { color: "var(--bb-text)" }, children: "What we can't promise (stated on purpose)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "list-disc pl-4 space-y-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "var(--bb-text)" }, className: "font-semibold", children: "Unaudited." }),
                  " ",
                  "No third party has audited this code."
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "var(--bb-text)" }, className: "font-semibold", children: "Single operator." }),
                  " ",
                  "One person controls the backend and sets the sGLDT/USD reference leg of the rate."
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Refine payouts depend on treasury liquidity — shown live above. If it runs short, your deposit is auto-refunded, never taken." }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "sGLDT's peg is sVault's contract and GLDT's gold backing is Gold DAO's — we link them, we don't control them." })
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            "data-ocid": "landing.open_proof",
            onClick: onOpenProof,
            className: "mt-4 inline-flex min-h-[44px] items-center text-sm font-bold underline underline-offset-4",
            style: { color: "var(--bb-brand)" },
            children: "Open the full proof page ›"
          }
        )
      ]
    }
  );
}
function Figure({
  label,
  value,
  note
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "rounded-2xl border p-4",
      style: { borderColor: "var(--bb-border)", background: "var(--bb-bg-soft)" },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "t-label mb-1", style: { color: "var(--bb-text-muted)" }, children: label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xl font-black tabular-nums", style: { color: "var(--bb-text)" }, children: value }),
        note && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] mt-0.5", style: { color: "var(--bb-text-muted)" }, children: note })
      ]
    }
  );
}
function buildItems(batSupported) {
  return [
    {
      q: "Is this custodial? Do you hold my money?",
      a: /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        "No. DFINITY's chain-key minter credits your bridged tokens to",
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "your own account" }),
        ", and the gold lands in your vault. The refinery holds funds only for the seconds of the atomic swap, and a failed swap refunds you automatically. Four of the five custody steps are yours — the refinery's rail on the refinery page names each one."
      ] })
    },
    {
      q: "What actually backs sGLDT?",
      a: /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        "sGLDT is a 1:1 wrapper of ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "GLDT" }),
        ", Gold DAO's token — each backed by 0.01 g of LBMA-sourced physical gold in audited Swiss vaults. The wrapper exists purely for fees (0.00001 vs 0.10 per transfer, ~10,000× cheaper). Unwrap at sVault any time; redeem GLDT for metal through Gold DAO.",
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "a",
          {
            href: "https://gldt.org",
            target: "_blank",
            rel: "noopener noreferrer",
            className: "underline underline-offset-2",
            style: { color: "var(--bb-brand)" },
            children: "gldt.org"
          }
        ),
        " ",
        "explains the gold behind it. We link that chain — we don't control it."
      ] })
    },
    {
      q: "What happens if a swap fails?",
      a: /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        "Your deposit is refunded automatically to your own account — the swap and the refund are one atomic path in the canister. If even the refund fails, the record is ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "held" }),
        " on-chain with your funds noted, it appears in your activity with a resolution contact, and the live count of held swaps is published on the proof page — even when it's zero. Nothing is silently dropped."
      ] })
    },
    {
      q: "Do I need a seed phrase?",
      a: /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: "No. Your vault is an Internet Identity passkey — Face ID or a fingerprint, about 20 seconds to create, nothing to write down or lose. You'll also connect an ordinary Ethereum wallet for the tokens you're spending; that one is yours already." })
    },
    batSupported ? {
      q: "Is ckBAT intake actually live?",
      a: /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: "Yes. DFINITY's chain-key minter lists BAT, and this page checked that live on your visit — the chip at the top isn't static copy. BAT refines through the same treasury, the same atomic settle-or-refund, and the same public proof page as UNI." })
    } : {
      q: "When does BAT intake open?",
      a: /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: "When DFINITY's chain-key minter lists BAT — not before, and not on our say-so. The chip at the top of this page is a live read of the minter's supported-token list, so it tells you the truth on every visit." })
    },
    {
      q: "Who runs this, and how does it relate to Banking.Brave?",
      a: /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        "minegold.defi is an application in the",
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Banking.Brave" }),
        " ecosystem, which is powered by",
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "CafresoDAO" }),
        ". They are separate products: Banking.Brave is the institution; this is a refinery that runs under it. Day to day, the canisters here have a",
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "single controller" }),
        " — published on the proof page alongside the code's limitations — and the code is",
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "unaudited" }),
        ". Check the numbers before you send anything; that is what the proof page is for."
      ] })
    }
  ];
}
function FAQ({ batSupported = false }) {
  const items = buildItems(batSupported);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { "data-ocid": "landing.faq", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "h2",
      {
        className: "t-display mb-4",
        style: { fontSize: "clamp(1.5rem, 1.2rem + 1.4vw, 2rem)" },
        children: "Fair questions"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "details",
      {
        className: "group rounded-2xl border px-4 py-3",
        style: {
          borderColor: "var(--bb-border)",
          background: "var(--bb-surface)"
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("summary", { className: "cursor-pointer list-none text-sm font-bold marker:hidden flex items-center justify-between gap-3 min-h-[28px]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: item.q }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                "aria-hidden": true,
                className: "shrink-0 transition-transform group-open:rotate-45",
                style: { color: "var(--bb-text-dim)" },
                children: "+"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "p",
            {
              className: "mt-2 text-[13px] leading-relaxed",
              style: { color: "var(--bb-text-muted)" },
              children: item.a
            }
          )
        ]
      },
      item.q
    )) })
  ] });
}
function UniBadge({ size = 44 }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: size, height: size, viewBox: "0 0 32 32", "aria-label": "UNI", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "16", cy: "16", r: "16", fill: "#FF007A" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { fill: "#fff", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M12.261 5.767c-.285-.044-.297-.05-.163-.07.257-.04.865.015 1.284.114.977.233 1.866.828 2.816 1.885l.252.28.36-.057c1.52-.245 3.067-.05 4.36.547.356.164.917.491.987.576.023.026.064.199.091.383.096.637.048 1.125-.146 1.49-.106.198-.112.26-.041.43a.416.416 0 00.372.236c.322 0 .668-.52.828-1.243l.064-.287.126.143c.692.784 1.235 1.853 1.328 2.613l.025.199-.117-.18c-.2-.31-.4-.522-.658-.693-.464-.307-.955-.411-2.255-.48-1.174-.062-1.839-.162-2.497-.377-1.121-.365-1.686-.852-3.018-2.599-.591-.776-.957-1.205-1.32-1.55-.827-.786-1.639-1.198-2.678-1.36z" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M22.422 7.5c.03-.52.1-.863.242-1.176.056-.124.109-.226.117-.226a.773.773 0 01-.055.204c-.103.304-.12.72-.049 1.203.09.614.142.702.79 1.365.305.311.659.703.787.872l.233.306-.233-.219c-.285-.267-.941-.79-1.086-.864-.097-.05-.112-.049-.172.01-.055.056-.067.138-.074.529-.012.608-.095 1-.296 1.39-.108.21-.125.166-.027-.073.073-.178.08-.256.08-.845 0-1.184-.141-1.468-.966-1.956a9.046 9.046 0 00-.764-.396 2.916 2.916 0 01-.374-.182c.023-.023.827.211 1.15.336.482.185.561.209.62.186.039-.015.058-.129.077-.464zm-9.607 2.025c-.579-.797-.937-2.02-.86-2.934l.024-.283.132.024c.248.045.675.204.875.326.548.333.786.772 1.027 1.898.071.33.164.703.207.83.068.203.328.678.54.987.152.222.05.327-.286.297-.514-.047-1.21-.527-1.659-1.145zm8.905 5.935c-2.707-1.09-3.66-2.036-3.66-3.632 0-.235.008-.427.017-.427.01 0 .115.077.233.172.549.44 1.164.628 2.865.876 1.001.147 1.565.265 2.085.437 1.652.548 2.674 1.66 2.918 3.174.07.44.029 1.265-.086 1.7-.09.344-.367.963-.44.987-.02.006-.04-.071-.046-.178-.028-.568-.315-1.122-.798-1.537-.549-.471-1.286-.847-3.089-1.572zm-1.9.452a4.808 4.808 0 00-.131-.572l-.07-.206.129.144c.177.2.318.454.436.794.091.259.101.336.1.757 0 .414-.011.5-.095.734a2.32 2.32 0 01-.571.908c-.495.504-1.13.782-2.048.898-.16.02-.624.054-1.033.075-1.03.054-1.707.164-2.316.378a.488.488 0 01-.174.042c-.024-.025.39-.272.733-.437.483-.233.963-.36 2.04-.539.532-.089 1.082-.196 1.221-.239 1.318-.404 1.995-1.446 1.778-2.737z" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M21.06 18.116c-.36-.773-.442-1.52-.245-2.216.021-.074.055-.135.075-.135a.73.73 0 01.189.102c.166.112.498.3 1.383.782 1.105.603 1.735 1.07 2.164 1.602.375.467.607.999.719 1.647.063.367.026 1.25-.068 1.62-.297 1.166-.988 2.082-1.972 2.616a2.53 2.53 0 01-.288.143c-.014 0 .038-.133.117-.297.33-.692.369-1.366.118-2.116-.153-.459-.466-1.02-1.097-1.966-.734-1.1-.914-1.394-1.095-1.782zm-10.167 4.171c1.005-.848 2.254-1.45 3.393-1.635.49-.08 1.308-.048 1.762.068.728.186 1.38.604 1.719 1.101.33.486.473.91.62 1.852.06.372.123.745.142.83.11.488.327.879.595 1.075.425.311 1.158.33 1.878.05a.981.981 0 01.236-.074c.026.026-.336.269-.592.397a2.014 2.014 0 01-.983.238c-.66 0-1.208-.335-1.665-1.02-.09-.135-.292-.538-.45-.897-.482-1.1-.72-1.436-1.28-1.803-.489-.32-1.118-.377-1.591-.145-.622.305-.795 1.1-.35 1.603.177.2.507.373.777.406a.83.83 0 00.939-.83c0-.332-.128-.52-.448-.665-.437-.197-.907.033-.905.444.001.175.077.285.253.365.113.05.115.055.023.036-.401-.084-.495-.567-.172-.888.387-.386 1.188-.216 1.463.31.116.221.129.662.028.928-.225.595-.883.907-1.55.737-.454-.116-.639-.241-1.186-.805-.951-.98-1.32-1.17-2.692-1.384l-.263-.041.3-.253z" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M6.196 3.35l.096.117c3.708 4.54 5.624 6.896 5.746 7.064.2.278.125.527-.219.723-.191.109-.585.219-.781.219-.223 0-.474-.107-.657-.28-.129-.123-.65-.901-1.853-2.768a188.53 188.53 0 00-1.712-2.633c-.049-.046-.048-.045 1.618 2.936 1.046 1.872 1.4 2.533 1.4 2.622 0 .18-.05.274-.272.522-.37.413-.535.877-.655 1.837-.134 1.077-.51 1.837-1.554 3.138-.61.762-.71.902-.865 1.209-.194.386-.247.603-.269 1.091-.023.516.022.85.18 1.343.138.432.282.718.65 1.288.318.493.501.859.501 1.002 0 .114.022.114.515.003 1.179-.266 2.136-.735 2.675-1.309.333-.355.411-.551.414-1.038.001-.318-.01-.385-.096-.568-.14-.298-.395-.546-.957-.93-.737-.504-1.051-.91-1.138-1.467-.072-.457.011-.78.419-1.634.421-.884.526-1.26.597-2.151.045-.576.108-.803.274-.985.172-.19.328-.255.755-.313.696-.095 1.139-.275 1.503-.61.316-.292.448-.573.468-.995l.016-.32-.177-.206c-.254-.296-2.355-2.614-6.304-6.956l-.106-.115-.212.165zM7.91 19.732a.566.566 0 00-.174-.746c-.228-.152-.583-.08-.583.118 0 .06.033.104.108.143.127.065.136.139.037.288-.101.152-.093.286.023.377.186.146.45.065.59-.18zm5.524-7.176c-.327.1-.644.447-.743.81-.06.221-.026.61.064.73.145.194.286.245.666.242.744-.005 1.39-.324 1.466-.723.062-.327-.223-.78-.614-.98-.202-.102-.631-.143-.839-.079zm.87.68c.115-.163.064-.34-.13-.458-.372-.227-.934-.04-.934.312 0 .174.293.365.561.365.18 0 .424-.107.503-.219z" })
    ] })
  ] });
}
function BatBadge({ size = 44 }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: size, height: size, viewBox: "0 0 32 32", "aria-label": "BAT", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "16", cy: "16", r: "16", fill: "#FF5000" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "path",
      {
        fill: "#fff",
        d: "M6 23.5l10.051-17L26 23.477 6 23.5zm10.027-10.12l-4.108 6.786h8.235l-4.127-6.786z"
      }
    )
  ] });
}
function TokenRefineVisual({ batLive }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "relative overflow-hidden rounded-3xl border p-6",
      style: {
        borderColor: "var(--roast-banana-rim)",
        background: "linear-gradient(155deg, var(--roast-coffee) 0%, #1a1408 55%, var(--roast-coffee) 100%)"
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "pointer-events-none absolute inset-0 animate-shimmer",
            "aria-hidden": true,
            style: {
              background: "linear-gradient(100deg, transparent 30%, rgba(245,210,93,0.16) 50%, transparent 70%)"
            }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex items-center justify-center gap-3 sm:gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(UniBadge, {}),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                className: "t-label",
                style: { color: "var(--roast-crema)" },
                children: "UNI"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xl font-black", style: { color: "var(--roast-crema)" }, children: "+" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(BatBadge, {}),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "span",
              {
                className: "t-label flex items-center gap-1",
                style: { color: batLive ? "var(--trust-verified)" : "var(--roast-crema)" },
                children: [
                  "BAT",
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "span",
                    {
                      className: "h-1 w-1 rounded-full",
                      style: { background: batLive ? "var(--trust-verified)" : "var(--roast-crema)" },
                      "aria-hidden": true
                    }
                  )
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { size: 18, style: { color: "var(--roast-banana-rim)" }, "aria-hidden": true }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                className: "flex h-11 w-11 items-center justify-center rounded-full text-[11px] font-black shadow-lg",
                style: {
                  background: "radial-gradient(circle at 35% 30%, var(--gold-300), var(--gold-500) 55%, var(--gold-700) 100%)",
                  color: "var(--roast-coffee)"
                },
                children: "Au"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "t-label", style: { color: "var(--gold-400)" }, children: "sGLDT" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "p",
          {
            className: "relative mt-4 text-center text-[11px] leading-relaxed",
            style: { color: "var(--roast-crema)" },
            children: "Either token in, physically-backed gold out — the same treasury, the same atomic settlement, the same auto-refund on failure."
          }
        )
      ]
    }
  );
}
function LandingPage({
  onOpenRefinery,
  onOpenBrave,
  onOpenProof,
  onNavigatePath
}) {
  const [bat, setBat] = reactExports.useState(null);
  const [sticky, setSticky] = reactExports.useState(false);
  reactExports.useEffect(() => {
    let cancelled = false;
    fetchCkBatStatus().then((s) => {
      if (!cancelled) setBat(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  reactExports.useEffect(() => {
    const onScroll = () => setSticky(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const batChip = bat === null ? "checking DFINITY's minter…" : bat.supported ? "BAT is listed — intake can open" : bat.error ? "minter status check unavailable" : "BAT not yet listed — checked live just now";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      "data-ocid": "landing.page",
      className: "min-h-screen",
      style: { background: "var(--bb-bg)", color: "var(--bb-text)" },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(IncidentBanner, { onNavigatePath }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "fixed bottom-0 inset-x-0 z-40 px-4 pb-4 pointer-events-none sm:px-6",
            style: {
              opacity: sticky ? 1 : 0,
              transform: sticky ? "none" : "translateY(12px)",
              transition: "opacity 300ms var(--ease-settle), transform 300ms var(--ease-settle)"
            },
            "aria-hidden": !sticky,
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                "data-ocid": "landing.sticky_cta",
                onClick: onOpenRefinery,
                tabIndex: sticky ? 0 : -1,
                className: "pointer-events-auto mx-auto flex w-full max-w-sm items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold shadow-2xl",
                style: { background: "var(--royal-700)", color: "#ffffff" },
                children: [
                  "Open the refinery ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { size: 15 })
                ]
              }
            )
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-10", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-lg font-black tracking-tight", children: [
              "minegold",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "var(--gold-500)" }, children: ".defi" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  "data-ocid": "landing.topbar_brave",
                  onClick: onOpenBrave,
                  className: "hidden items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-[11px] font-semibold sm:inline-flex",
                  style: { borderColor: "var(--bb-border)", color: "var(--bb-text-dim)" },
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "img",
                      {
                        src: "/brand/icon-512.png",
                        alt: "",
                        width: 18,
                        height: 18,
                        className: "rounded-full"
                      }
                    ),
                    "Banking.Brave"
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(ThemeToggle, {})
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "mb-16 grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:items-center", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-3xl", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "p",
                {
                  className: "t-label mb-3",
                  style: { color: "var(--bb-text-dim)" },
                  children: "An ERC-20 refinery on the Internet Computer"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "t-display", children: "Tokens in. Gold out." }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "p",
                {
                  className: "mt-4 max-w-2xl text-[15px] leading-relaxed",
                  style: { color: "var(--bb-text-muted)" },
                  children: [
                    "Turn an ERC-20 token into",
                    " ",
                    /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { style: { color: "var(--gold-500)" }, children: "sGLDT" }),
                    " — physical gold, 1:1. No company holding your funds. Exit anytime."
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 flex flex-wrap items-center gap-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    type: "button",
                    "data-ocid": "landing.hero_cta",
                    onClick: onOpenRefinery,
                    className: "inline-flex min-h-[48px] items-center gap-2 rounded-2xl px-5 text-sm font-bold shadow-lg transition-transform hover:-translate-y-0.5",
                    style: { background: "var(--royal-700)", color: "#ffffff" },
                    children: [
                      "Open the refinery ",
                      /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { size: 15 })
                    ]
                  }
                ),
                (bat == null ? void 0 : bat.supported) && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    type: "button",
                    "data-ocid": "landing.hero_bat_cta",
                    onClick: onOpenBrave,
                    className: "inline-flex min-h-[48px] items-center gap-2 rounded-2xl border px-5 text-sm font-bold transition-transform hover:-translate-y-0.5",
                    style: {
                      borderColor: "rgba(52,211,153,0.4)",
                      color: "var(--trust-verified)"
                    },
                    children: [
                      "Refine ckBAT ",
                      /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { size: 15 })
                    ]
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    "data-ocid": "landing.hero_proof",
                    onClick: onOpenProof,
                    className: "inline-flex min-h-[48px] items-center text-sm font-bold underline underline-offset-4",
                    style: { color: "var(--bb-brand)" },
                    children: "Read the proof first ›"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-5 flex flex-wrap items-center gap-2 text-[11px]", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "span",
                  {
                    className: "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-semibold",
                    style: {
                      borderColor: "rgba(52,211,153,0.3)",
                      background: "rgba(52,211,153,0.1)",
                      color: "var(--trust-verified)"
                    },
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "span",
                        {
                          className: "h-1.5 w-1.5 rounded-full",
                          style: { background: "var(--trust-verified)" }
                        }
                      ),
                      "UNI intake live on mainnet"
                    ]
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    type: "button",
                    "data-ocid": "landing.bat_status",
                    onClick: onOpenBrave,
                    className: "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-semibold",
                    style: (bat == null ? void 0 : bat.supported) ? {
                      borderColor: "rgba(52,211,153,0.3)",
                      background: "rgba(52,211,153,0.1)",
                      color: "var(--trust-verified)"
                    } : {
                      borderColor: "rgba(255,122,69,0.3)",
                      background: "rgba(255,122,69,0.1)",
                      color: "#ff9a6e"
                    },
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "span",
                        {
                          className: "h-1.5 w-1.5 rounded-full",
                          style: {
                            background: (bat == null ? void 0 : bat.supported) ? "var(--trust-verified)" : "var(--trust-unknown)"
                          }
                        }
                      ),
                      batChip
                    ]
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TokenRefineVisual, { batLive: (bat == null ? void 0 : bat.supported) ?? false })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Reveal, { className: "mb-16", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-4 sm:grid-cols-3", children: [
            {
              accent: "var(--royal-400)",
              kicker: "Bridge",
              body: "DFINITY's chain-key minter moves your token onto ICP, straight to your own account."
            },
            {
              accent: "var(--gold-500)",
              kicker: "Refine",
              body: "One swap converts it to sGLDT at the canister's on-chain rate. Failed swaps refund automatically."
            },
            {
              accent: "var(--trust-verified)",
              kicker: "Hold or exit",
              body: "Your gold sits in a vault only your passkey opens. Redeem to ckUNI anytime."
            }
          ].map((b, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "relative rounded-3xl border p-5",
              style: {
                borderColor: "var(--bb-border)",
                background: "var(--bb-surface)"
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "span",
                  {
                    className: "mb-2 block h-1 w-8 rounded-full",
                    style: { background: b.accent }
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-base font-black", children: b.kicker }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "p",
                  {
                    className: "mt-1 text-[13px] leading-relaxed",
                    style: { color: "var(--bb-text-muted)" },
                    children: b.body
                  }
                ),
                i < 2 && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  ChevronRight,
                  {
                    size: 16,
                    "aria-hidden": true,
                    className: "absolute -right-3 top-1/2 hidden -translate-y-1/2 sm:block",
                    style: { color: "var(--bb-text-dim)" }
                  }
                )
              ]
            },
            b.kicker
          )) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Reveal, { className: "mb-16", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ProofBand, { onOpenProof }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Reveal, { className: "mb-16", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "h2",
              {
                className: "t-display mb-4",
                style: { fontSize: "clamp(1.5rem, 1.2rem + 1.4vw, 2rem)" },
                children: "Four steps, about three minutes"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("ol", { className: "grid gap-3 sm:grid-cols-4", children: JOURNEY.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "li",
              {
                className: "rounded-2xl border p-4",
                style: {
                  borderColor: "var(--bb-border)",
                  background: "var(--bb-surface)"
                },
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "span",
                    {
                      className: "mb-1.5 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold",
                      style: { background: "var(--royal-700)", color: "#ffffff" },
                      children: s.n
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-bold", children: s.title }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "p",
                    {
                      className: "mt-0.5 text-[12px] leading-relaxed",
                      style: { color: "var(--bb-text-muted)" },
                      children: s.sub
                    }
                  )
                ]
              },
              s.n
            )) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 text-[12px]", style: { color: "var(--bb-text-dim)" }, children: "The wait in step 3 is Ethereum's — 12 blocks. Close the tab if you want; the payout still lands on-chain." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Reveal, { className: "mb-16", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "h2",
              {
                className: "t-display mb-4",
                style: { fontSize: "clamp(1.5rem, 1.2rem + 1.4vw, 2rem)" },
                children: "Where this stands today"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                className: "rounded-3xl border p-6",
                style: {
                  borderColor: "var(--bb-border)",
                  background: "var(--bb-surface)"
                },
                children: /* @__PURE__ */ jsxRuntimeExports.jsxs("dl", { className: "grid gap-5 sm:grid-cols-3", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { className: "t-label mb-1", style: { color: "var(--bb-text-dim)" }, children: "Live intake" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { className: "text-sm font-bold", children: "minegold.uni" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "dd",
                      {
                        className: "mt-1 text-[12px] leading-relaxed",
                        style: { color: "var(--bb-text-muted)" },
                        children: "UNI → ckUNI → sGLDT. Live on mainnet today."
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { className: "t-label mb-1", style: { color: "var(--bb-text-dim)" }, children: (bat == null ? void 0 : bat.supported) ? "Live intake" : "Next intake" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { className: "text-sm font-bold", children: "BAT" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "dd",
                      {
                        className: "mt-1 text-[12px] leading-relaxed",
                        style: { color: "var(--bb-text-muted)" },
                        children: (bat == null ? void 0 : bat.supported) ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                          "BAT → ckBAT → sGLDT. Live on mainnet today, same treasury and settlement as UNI.",
                          " ",
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            "button",
                            {
                              type: "button",
                              onClick: onOpenBrave,
                              className: "underline underline-offset-2",
                              style: { color: "var(--bb-brand)" },
                              children: "Refine now ›"
                            }
                          )
                        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                          "Opens if DFINITY's minter lists BAT. The status chip above checks live, every visit.",
                          " ",
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            "button",
                            {
                              type: "button",
                              onClick: onOpenBrave,
                              className: "underline underline-offset-2",
                              style: { color: "var(--bb-brand)" },
                              children: "Live status ›"
                            }
                          )
                        ] })
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { className: "t-label mb-1", style: { color: "var(--bb-text-dim)" }, children: "Home" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { className: "text-sm font-bold", children: "minegold.brave" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "dd",
                      {
                        className: "mt-1 text-[12px] leading-relaxed",
                        style: { color: "var(--bb-text-muted)" },
                        children: "Where this app will move. Its canister address keeps working either way."
                      }
                    )
                  ] })
                ] })
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Reveal, { className: "mb-16", children: /* @__PURE__ */ jsxRuntimeExports.jsx(FAQ, { batSupported: (bat == null ? void 0 : bat.supported) ?? false }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "footer",
            {
              className: "border-t pt-6 pb-24 text-[11px] leading-relaxed",
              style: { borderColor: "var(--bb-border)", color: "var(--bb-text-dim)" },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("nav", { className: "mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px]", children: [
                  [
                    ["How it works", "/docs/how-it-works"],
                    ["Risks & limitations", "/docs/risks"],
                    ["How the rate is made", "/docs/rate-methodology"],
                    ["Redeem & recovery", "/docs/redeem-and-recovery"],
                    ["Status & incidents", "/status"]
                  ].map(([label, path]) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      type: "button",
                      "data-ocid": `landing.footer${path.replace(/\//g, ".")}`,
                      onClick: () => onNavigatePath(path),
                      className: "min-h-[32px] font-semibold underline underline-offset-2",
                      style: { color: "var(--bb-brand)" },
                      children: label
                    },
                    path
                  )),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "a",
                    {
                      href: "https://github.com/CafresoDAO/minegold.defi",
                      target: "_blank",
                      rel: "noopener noreferrer",
                      "data-ocid": "landing.footer.source",
                      className: "min-h-[32px] font-semibold underline underline-offset-2",
                      style: { color: "var(--bb-brand)" },
                      children: "Source on GitHub"
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mb-6 text-center", children: [
                  "Refinery backend",
                  " ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono", children: "c626g-iyaaa-aaaau-agpoa-cai" }),
                  " · frontend",
                  " ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono", children: "cqyto-tiaaa-aaaau-agppa-cai" }),
                  " · built on",
                  " ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "a",
                    {
                      href: "https://internetcomputer.org",
                      target: "_blank",
                      rel: "noopener noreferrer",
                      className: "underline underline-offset-2",
                      style: { color: "var(--bb-brand)" },
                      children: "Internet Computer Protocol"
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex flex-col items-center gap-2 text-center", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "img",
                    {
                      src: "/brand/icon-512.png",
                      alt: "Banking.Brave",
                      width: 48,
                      height: 48,
                      className: "rounded-full"
                    }
                  ),
                  "minegold.defi is a product of Banking.Brave, powered by CafresoDAO."
                ] })
              ]
            }
          )
        ] })
      ]
    }
  );
}
export {
  LandingPage
};
