import { c as createLucideIcon, r as reactExports, O as fetchMyCkBATPosition, Q as fetchCkBATFee, U as computeRefineAmounts, V as formatAssetAmount, X as CKBAT_ASSET, Y as approveCkBATForRefinery, Z as refineCkBAT, _ as fetchMyAutoRefineCkBAT, j as jsxRuntimeExports, L as LoaderCircle, $ as setAutoRefineCkBAT, a0 as CKBAT_STANDING_ALLOWANCE, a1 as fetchBatRateStatus, a2 as parseAssetAmount, s as CircleCheck, I as DASHBOARD, J as ExternalLink, g as RefreshCw, T as ThemeToggle } from "./index-CSqsgWTS.js";
import { A as ArrowRight } from "./arrow-right-CsK4pehQ.js";
import { f as fetchCkBatStatus, C as CK_MINTER_CANISTER_ID, B as BAT_ERC20_ADDRESS } from "./ckMinter-BJ5mBBkC.js";
import { A as ArrowLeft } from "./arrow-left-BwSRE5bN.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  ["path", { d: "m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7", key: "132q7q" }],
  ["rect", { x: "2", y: "4", width: "20", height: "16", rx: "2", key: "izxlao" }]
];
const Mail = createLucideIcon("mail", __iconNode);
function useBatRefineFlow(identity) {
  const [state, setState] = reactExports.useState({ kind: "idle" });
  const [position, setPosition] = reactExports.useState(null);
  const busyRef = reactExports.useRef(false);
  const refreshPosition = reactExports.useCallback(async () => {
    const pos = await fetchMyCkBATPosition(identity);
    if (pos) setPosition(pos);
    return pos;
  }, [identity]);
  const refineNow = reactExports.useCallback(
    async (requested, rateHint) => {
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        const pos = await fetchMyCkBATPosition(identity);
        if (!pos) {
          setState({
            kind: "failed",
            error: "Could not read your ckBAT position. Check your connection and try again.",
            recoverable: true
          });
          return;
        }
        setPosition(pos);
        if (pos.rate === 0n) {
          setState({
            kind: "failed",
            error: "BAT intake is not open yet — no exchange rate has been established. Your ckBAT is untouched.",
            recoverable: false
          });
          return;
        }
        const fee = pos.fee > 0n ? pos.fee : await fetchCkBATFee();
        const { refineAmount: amount, approveAmount } = computeRefineAmounts(
          pos.balance,
          requested,
          fee
        );
        if (amount < pos.minRefine) {
          const needed = pos.minRefine + 2n * fee;
          setState({
            kind: "failed",
            error: `Not enough ckBAT once ledger fees are covered. The ckBAT ledger charges ${formatAssetAmount(fee, CKBAT_ASSET, 2)} per transfer and this flow pays it twice, so you need at least ${formatAssetAmount(needed, CKBAT_ASSET)} ckBAT to refine the ${formatAssetAmount(pos.minRefine, CKBAT_ASSET, 2)} minimum. Your balance is ${formatAssetAmount(pos.balance, CKBAT_ASSET)}.`,
            recoverable: true
          });
          return;
        }
        if (pos.allowance < approveAmount) {
          setState({ kind: "approving", target: amount });
          const approval = await approveCkBATForRefinery({
            identity,
            amount: approveAmount
          });
          if (!approval.ok) {
            setState({
              kind: "failed",
              error: approval.error,
              recoverable: true
            });
            return;
          }
        }
        setState({ kind: "refining", target: amount });
        const result = await refineCkBAT({ identity, amount, rateHint });
        if (!result.ok) {
          setState({ kind: "failed", error: result.error, recoverable: true });
          return;
        }
        setState({
          kind: "done",
          sgldt: result.sgldtPaid,
          refineId: result.refineId,
          payBlock: result.blockIndex,
          settledRate: result.rate
        });
        void refreshPosition();
      } catch (err) {
        setState({
          kind: "failed",
          error: err instanceof Error ? err.message : String(err),
          recoverable: true
        });
      } finally {
        busyRef.current = false;
      }
    },
    [identity, refreshPosition]
  );
  const reset = reactExports.useCallback(() => {
    busyRef.current = false;
    setState({ kind: "idle" });
  }, []);
  const busy = state.kind === "approving" || state.kind === "refining";
  return { state, position, busy, refineNow, refreshPosition, reset };
}
function AutoRefineCard({ identity, balance, fee, onChanged }) {
  const [setting, setSetting] = reactExports.useState(
    void 0
  );
  const [busy, setBusy] = reactExports.useState(null);
  const [error, setError] = reactExports.useState(null);
  const load = reactExports.useCallback(() => {
    void fetchMyAutoRefineCkBAT(identity).then(setSetting);
  }, [identity]);
  reactExports.useEffect(() => {
    load();
  }, [load]);
  const enabled = (setting == null ? void 0 : setting.enabled) === true;
  const canPayFee = balance >= fee;
  const turnOn = async () => {
    setBusy("on");
    setError(null);
    const approved = await approveCkBATForRefinery({
      identity,
      amount: CKBAT_STANDING_ALLOWANCE
    });
    if (!approved.ok) {
      setError(approved.error);
      setBusy(null);
      return;
    }
    const r = await setAutoRefineCkBAT({ identity, enabled: true });
    if (!r.ok) setError(r.error);
    else setSetting(r.setting);
    setBusy(null);
    onChanged();
  };
  const turnOff = async () => {
    setBusy("off");
    setError(null);
    const r = await setAutoRefineCkBAT({ identity, enabled: false });
    if (!r.ok) {
      setError(r.error);
      setBusy(null);
      return;
    }
    setSetting(r.setting);
    if (canPayFee) {
      const revoked = await approveCkBATForRefinery({ identity, amount: 0n });
      if (!revoked.ok) {
        setError(
          `Auto-refine is off, but the standing approval could not be revoked: ${revoked.error} You can revoke it later from this card.`
        );
      }
    } else {
      setError(
        `Auto-refine is off. The standing approval is still on the ledger (revoking costs ${formatAssetAmount(fee, CKBAT_ASSET, 2)} ckBAT, which you don't hold right now) — it can't move anything while this is off, and you can revoke it once you have ckBAT again.`
      );
    }
    setBusy(null);
    onChanged();
  };
  const lastRun = setting && setting.lastRunNs > 0n ? new Date(Number(setting.lastRunNs / 1000000n)).toLocaleString() : null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      "data-ocid": "brave.autorefine",
      className: "mt-5 rounded-2xl border p-4",
      style: {
        borderColor: enabled ? "rgba(52,211,153,0.35)" : "var(--bb-border)",
        background: enabled ? "rgba(52,211,153,0.06)" : "var(--bb-surface-soft)"
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm font-bold", children: [
              "Auto-refine",
              " ",
              enabled && /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: "ml-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider",
                  style: {
                    background: "rgba(52,211,153,0.15)",
                    color: "var(--trust-verified)"
                  },
                  children: "on"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "p",
              {
                className: "mt-1 text-[12px] leading-relaxed",
                style: { color: "var(--bb-text-muted)" },
                children: "Whenever ckBAT lands in your vault, the refinery turns it into sGLDT for you — hourly, at the live rate, with the same automatic refund if a payout ever fails. Brave pays rewards monthly; this is how they become gold without you coming back."
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              role: "switch",
              "aria-checked": enabled,
              "aria-label": enabled ? "Turn auto-refine off" : "Turn auto-refine on",
              "data-ocid": "brave.autorefine.toggle",
              disabled: busy !== null || setting === void 0 || !enabled && !canPayFee,
              onClick: () => void (enabled ? turnOff() : turnOn()),
              className: "relative inline-flex h-11 w-[72px] shrink-0 items-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400",
              style: {
                borderColor: enabled ? "var(--trust-verified)" : "var(--bb-border)",
                background: enabled ? "var(--trust-verified)" : "var(--bb-bg-soft)"
              },
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: "absolute flex h-9 w-9 items-center justify-center rounded-full shadow transition-transform",
                  style: {
                    background: "#ffffff",
                    transform: enabled ? "translateX(32px)" : "translateX(3px)"
                  },
                  children: busy && /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 14, className: "animate-spin", style: { color: "var(--ink-800)" } })
                }
              )
            }
          )
        ] }),
        !enabled && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "p",
          {
            className: "mt-2 text-[11px] leading-relaxed",
            style: { color: "var(--bb-text-dim)" },
            children: [
              "Turning this on signs one standing approval for the refinery to pull ckBAT from your account (costs the",
              " ",
              formatAssetAmount(fee, CKBAT_ASSET, 2),
              " ckBAT ledger fee once). Your balance is the real cap — it can only ever pull what is there. Turning it off revokes the approval.",
              !canPayFee && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                " ",
                "You need at least ",
                formatAssetAmount(fee, CKBAT_ASSET, 2),
                " ckBAT to sign it."
              ] })
            ]
          }
        ),
        enabled && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "p",
          {
            className: "mt-2 text-[11px] leading-relaxed tabular-nums",
            style: { color: "var(--bb-text-dim)" },
            children: [
              setting.refines > 0n ? `${String(setting.refines)} auto-refine${setting.refines === 1n ? "" : "s"} so far.` : "No auto-refine yet.",
              " ",
              lastRun ? `Last check ${lastRun}: ${setting.lastResult}` : "First check within the hour."
            ]
          }
        ),
        error && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "p",
          {
            role: "alert",
            className: "mt-2 text-[11px] leading-relaxed",
            style: { color: "var(--trust-fault)" },
            children: error
          }
        )
      ]
    }
  );
}
function BatIntakePanel({ identity, onSignIn }) {
  const { state, position, busy, refineNow, refreshPosition, reset } = useBatRefineFlow(identity);
  const [amountText, setAmountText] = reactExports.useState("");
  const [loadingPosition, setLoadingPosition] = reactExports.useState(false);
  const [rateStatus, setRateStatus] = reactExports.useState(null);
  const [positionFailed, setPositionFailed] = reactExports.useState(false);
  const loadPosition = reactExports.useCallback(() => {
    setLoadingPosition(true);
    void refreshPosition().then((pos) => setPositionFailed(pos == null)).finally(() => setLoadingPosition(false));
  }, [refreshPosition]);
  reactExports.useEffect(() => {
    if (!identity) return;
    loadPosition();
  }, [identity, loadPosition]);
  reactExports.useEffect(() => {
    void fetchBatRateStatus().then(setRateStatus);
  }, []);
  const fee = (position == null ? void 0 : position.fee) ?? CKBAT_ASSET.feeFallback;
  const minRefine = (position == null ? void 0 : position.minRefine) ?? CKBAT_ASSET.minRefineFallback;
  const balance = (position == null ? void 0 : position.balance) ?? 0n;
  const rate = (position == null ? void 0 : position.rate) ?? 0n;
  const spendable = balance > 2n * fee ? balance - 2n * fee : 0n;
  const hasEnough = spendable >= minRefine;
  const requested = reactExports.useMemo(
    () => parseAssetAmount(amountText, CKBAT_ASSET),
    [amountText]
  );
  const estimatedSgldt = reactExports.useMemo(() => {
    if (rate === 0n || requested === 0n) return 0n;
    return requested * rate / 1000000000000000000n;
  }, [requested, rate]);
  const amountValid = requested > 0n && requested <= spendable && requested >= minRefine;
  const intakeOpen = rate > 0n;
  if (!identity) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "BAT intake · live" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm font-bold", children: "Refine ckBAT into gold" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "p",
        {
          className: "mt-1 text-[12px] leading-relaxed",
          style: { color: "var(--bb-text-muted)" },
          children: "Bring ckBAT you already hold and the refinery settles it into sGLDT — the same treasury, the same guaranteed pay-or-refund, the same public proof page as the UNI intake."
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          "data-ocid": "brave.intake.signin",
          onClick: onSignIn,
          className: "mt-4 inline-flex min-h-[48px] items-center gap-2 rounded-2xl px-5 text-sm font-bold",
          style: { background: "var(--royal-700)", color: "#ffffff" },
          children: [
            "Sign in to refine ",
            /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { size: 15 })
          ]
        }
      )
    ] });
  }
  if (state.kind === "done") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        CircleCheck,
        {
          size: 20,
          className: "mt-0.5 shrink-0",
          style: { color: "var(--trust-verified)" }
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-bold", children: "Refined" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "p",
          {
            className: "mt-1 text-[12px] leading-relaxed",
            style: { color: "var(--bb-text-muted)" },
            children: [
              (Number(state.sgldt) / 1e8).toFixed(4),
              " sGLDT is in your account. Settled at ",
              (Number(state.settledRate) / 1e8).toFixed(6),
              " sGLDT per BAT, sGLDT ledger block",
              " ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono", children: state.payBlock.toString() }),
              "."
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex flex-wrap gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              "data-ocid": "brave.intake.again",
              onClick: () => {
                reset();
                setAmountText("");
                void refreshPosition();
              },
              className: "inline-flex min-h-[44px] items-center gap-1.5 text-xs font-bold",
              style: { color: "var(--bb-brand)" },
              children: [
                "Refine more ",
                /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { size: 13 })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "a",
            {
              href: `${DASHBOARD}/${CKBAT_ASSET.ledgerCanisterId}`,
              target: "_blank",
              rel: "noopener noreferrer",
              className: "inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold",
              style: { color: "var(--bb-text-dim)" },
              children: [
                "ckBAT ledger ",
                /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { size: 11 })
              ]
            }
          )
        ] })
      ] })
    ] }) });
  }
  if (!loadingPosition && positionFailed) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "BAT intake" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm font-bold", children: "Couldn't read your balance" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "p",
        {
          className: "mt-1 text-[12px] leading-relaxed",
          style: { color: "var(--bb-text-muted)" },
          children: "The ckBAT ledger didn't answer, so we don't know what you hold — this is not the same as holding nothing, and nothing has been taken or changed. Your balance lives on the ledger, not with us."
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          "data-ocid": "brave.intake.retry",
          onClick: loadPosition,
          className: "mt-4 inline-flex min-h-[48px] items-center gap-2 rounded-2xl px-5 text-sm font-bold",
          style: { background: "var(--royal-700)", color: "#ffffff" },
          children: [
            "Try again ",
            /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { size: 14 })
          ]
        }
      )
    ] });
  }
  if (!loadingPosition && position && !intakeOpen) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Label, { children: [
        "BAT intake · ",
        (rateStatus == null ? void 0 : rateStatus.rate) ? "paused" : "opening"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm font-bold", children: (rateStatus == null ? void 0 : rateStatus.rate) ? "Price feed has gone quiet" : "Waiting on the first rate" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "p",
        {
          className: "mt-1 text-[12px] leading-relaxed",
          style: { color: "var(--bb-text-muted)" },
          children: [
            (rateStatus == null ? void 0 : rateStatus.rate) ? `The refinery last confirmed a BAT price more than ${rateStatus.maxAgeNs / 3600000000000n} hours ago and will not settle against a number that old. It reopens on its own as soon as the oracle reports again.` : "ckBAT is listed by the minter and the refinery accepts it, but no BAT/USD rate has been established yet. The refinery refuses to settle until it has one rather than pay out against a guessed number.",
            " ",
            "Your ckBAT is untouched."
          ]
        }
      ),
      rateStatus && !rateStatus.rate && /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "p",
        {
          className: "mt-2 text-[11px] tabular-nums",
          style: { color: "var(--bb-text-dim)" },
          children: [
            rateStatus.samples.length,
            "/",
            String(rateStatus.sampleWindow),
            " price samples collected — the rate is the median of the window, so the door opens once it is full."
          ]
        }
      )
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "BAT intake · live" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          "data-ocid": "brave.intake.refresh",
          onClick: loadPosition,
          disabled: loadingPosition || busy,
          className: "inline-flex min-h-[44px] items-center gap-1.5 px-1 text-[11px] font-semibold disabled:opacity-40",
          style: { color: "var(--bb-text-dim)" },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              RefreshCw,
              {
                size: 12,
                className: loadingPosition ? "animate-spin" : ""
              }
            ),
            "balance"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex items-baseline gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "t-display", style: { fontSize: "1.6rem" }, children: formatAssetAmount(balance, CKBAT_ASSET) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "span",
        {
          className: "text-sm font-semibold",
          style: { color: "var(--bb-text-muted)" },
          children: "ckBAT"
        }
      )
    ] }),
    balance === 0n ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      "p",
      {
        className: "mt-2 text-[12px] leading-relaxed",
        style: { color: "var(--bb-text-muted)" },
        children: "You don't hold any ckBAT yet. Mint it yourself through DFINITY's chain-key minter — deposit BAT on Ethereum naming your own principal, and the minter credits ckBAT directly to you after ~12 block confirmations. We never touch your Ethereum side; the ckBAT landing in your account is the only proof this page needs."
      }
    ) : !hasEnough ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "p",
      {
        className: "mt-2 text-[12px] leading-relaxed",
        style: { color: "var(--bb-text-muted)" },
        children: [
          "Not quite enough to refine. The ckBAT ledger charges",
          " ",
          formatAssetAmount(fee, CKBAT_ASSET, 2),
          " per transfer and this flow pays it twice, so you need",
          " ",
          formatAssetAmount(minRefine + 2n * fee, CKBAT_ASSET),
          " ckBAT to refine the ",
          formatAssetAmount(minRefine, CKBAT_ASSET, 2),
          " minimum."
        ]
      }
    ) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "p",
        {
          className: "mt-1 text-[11px]",
          style: { color: "var(--bb-text-dim)" },
          children: [
            formatAssetAmount(spendable, CKBAT_ASSET),
            " refinable after the two",
            " ",
            formatAssetAmount(fee, CKBAT_ASSET, 2),
            " ledger fees"
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "label",
          {
            htmlFor: "bat-amount",
            className: "t-label block",
            style: { color: "var(--bb-text-dim)" },
            children: "Amount to refine"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1.5 flex gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              id: "bat-amount",
              "data-ocid": "brave.intake.amount",
              inputMode: "decimal",
              value: amountText,
              onChange: (e) => setAmountText(e.target.value),
              disabled: busy,
              placeholder: formatAssetAmount(minRefine, CKBAT_ASSET, 2),
              className: "min-h-[48px] w-full rounded-2xl border px-4 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--bb-brand)] focus-visible:ring-offset-[var(--bb-surface)] disabled:opacity-50",
              style: {
                borderColor: "var(--bb-border)",
                background: "var(--bb-bg)",
                color: "var(--bb-text)"
              }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              "data-ocid": "brave.intake.max",
              onClick: () => setAmountText(formatAssetAmount(spendable, CKBAT_ASSET, 6)),
              disabled: busy,
              className: "min-h-[48px] shrink-0 rounded-2xl border px-4 text-xs font-bold disabled:opacity-50",
              style: {
                borderColor: "var(--bb-border)",
                color: "var(--bb-text-muted)"
              },
              children: "Max"
            }
          )
        ] }),
        requested > 0n && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "p",
          {
            className: "mt-2 text-[12px]",
            style: { color: "var(--bb-text-muted)" },
            children: amountValid ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              "You receive about",
              " ",
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "span",
                {
                  className: "font-mono font-bold",
                  style: { color: "var(--bb-text)" },
                  children: [
                    (Number(estimatedSgldt) / 1e8).toFixed(4),
                    " sGLDT"
                  ]
                }
              ),
              " ",
              "at ",
              (Number(rate) / 1e8).toFixed(6),
              " per BAT. The rate is re-read at settlement, so the final figure can move slightly."
            ] }) : requested < minRefine ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              "Minimum is ",
              formatAssetAmount(minRefine, CKBAT_ASSET, 2),
              " ",
              "ckBAT."
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              "More than you can refine —",
              " ",
              formatAssetAmount(spendable, CKBAT_ASSET),
              " is available after fees."
            ] })
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          "data-ocid": "brave.intake.refine",
          onClick: () => void refineNow(requested, rate > 0n ? rate : null),
          disabled: !amountValid || busy,
          className: "mt-4 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl px-5 text-sm font-bold disabled:opacity-40",
          style: { background: "var(--royal-700)", color: "#ffffff" },
          children: state.kind === "approving" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 15, className: "animate-spin" }),
            " Approving the refinery…"
          ] }) : state.kind === "refining" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 15, className: "animate-spin" }),
            " Refining…"
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            "Refine to sGLDT ",
            /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { size: 15 })
          ] })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "p",
        {
          className: "mt-2 text-[11px] leading-relaxed",
          style: { color: "var(--bb-text-dim)" },
          children: "Two signatures: one approving the refinery to pull that ckBAT, one settling the swap. If the sGLDT payout fails, the ckBAT is returned automatically."
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      AutoRefineCard,
      {
        identity,
        balance,
        fee,
        onChanged: loadPosition
      }
    ),
    state.kind === "failed" && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "mt-4 rounded-2xl border p-3",
        style: {
          borderColor: "var(--trust-fault)",
          background: "color-mix(in srgb, var(--trust-fault) 8%, transparent)"
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "p",
            {
              className: "text-[12px] leading-relaxed",
              style: { color: "var(--bb-text)" },
              children: state.error
            }
          ),
          state.recoverable && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              "data-ocid": "brave.intake.retry",
              onClick: reset,
              className: "mt-2 text-xs font-bold",
              style: { color: "var(--bb-brand)" },
              children: "Try again"
            }
          )
        ]
      }
    )
  ] });
}
function Card({ children }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      "data-ocid": "brave.intake",
      className: "rounded-3xl border p-6",
      style: {
        borderColor: "var(--bb-border)",
        background: "var(--bb-surface)"
      },
      children
    }
  );
}
function Label({ children }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "t-label", style: { color: "var(--bb-text-dim)" }, children });
}
const NOTIFY_EMAIL = "anthony@cafreso.com";
function MinegoldBraveSoon({
  onBack,
  onOpenUni,
  identity,
  onSignIn
}) {
  const [status, setStatus] = reactExports.useState(null);
  const [checkedAt, setCheckedAt] = reactExports.useState(null);
  reactExports.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const s = await fetchCkBatStatus();
      if (cancelled) return;
      setStatus(s);
      setCheckedAt(/* @__PURE__ */ new Date());
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const loading = status === null;
  const live = (status == null ? void 0 : status.supported) === true;
  const tokenCount = (status == null ? void 0 : status.allTokens.length) ?? 0;
  const notifyHref = `mailto:${NOTIFY_EMAIL}?subject=${encodeURIComponent("Notify me when BAT intake opens")}&body=${encodeURIComponent(
    "Add me to the BAT intake waitlist — one email when BAT → ckBAT → sGLDT opens on minegold.defi."
  )}`;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      "data-ocid": "brave.page",
      className: "min-h-screen",
      style: { background: "var(--bb-bg)", color: "var(--bb-text)" },
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-10 flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              "data-ocid": "brave.back",
              onClick: onBack,
              className: "inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold",
              style: { color: "var(--bb-text-muted)" },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { size: 14 }),
                " minegold.defi"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ThemeToggle, {})
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "t-label mb-3", style: { color: "var(--bb-text-dim)" }, children: "BAT intake · status" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "t-display", style: { fontSize: "clamp(1.9rem, 1.4rem + 2.2vw, 2.75rem)" }, children: "Ad revenue, refined to gold." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "p",
          {
            className: "mt-3 max-w-xl text-[15px] leading-relaxed",
            style: { color: "var(--bb-text-muted)" },
            children: "The Brave browser pays its users BAT for the ads they already see. This intake will accept that BAT and refine it into sGLDT — the same gold-backed token, through the same refinery, that the UNI intake settles today."
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            "data-ocid": "brave.status_card",
            className: "mt-8 rounded-3xl border p-6",
            style: { borderColor: "var(--bb-border)", background: "var(--bb-surface)" },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "t-label", style: { color: "var(--bb-text-dim)" }, children: "The one thing this is waiting on" }),
                checkedAt && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[10px]", style: { color: "var(--bb-text-dim)" }, children: [
                  "checked live at ",
                  checkedAt.toLocaleTimeString()
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex items-start gap-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "span",
                  {
                    "aria-hidden": true,
                    className: "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
                    style: {
                      background: loading ? "var(--trust-unknown)" : live ? "var(--trust-verified)" : (status == null ? void 0 : status.error) ? "var(--trust-fault)" : "var(--trust-attested)"
                    }
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-bold", children: loading ? "Reading DFINITY's chain-key minter…" : live ? "ckBAT is listed — the intake is opening" : (status == null ? void 0 : status.error) ? "The minter couldn't be reached just now" : "DFINITY's minter does not yet list BAT" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "p",
                    {
                      className: "mt-1 text-[12px] leading-relaxed",
                      style: { color: "var(--bb-text-muted)" },
                      children: [
                        "Chain-key intake requires DFINITY's ckERC-20 minter to support the token. That listing happens by NNS vote — a public process we participate in but don't control — so this page reads the minter's own supported-token list on every load",
                        tokenCount > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                          " (",
                          tokenCount,
                          " tokens listed today, BAT ",
                          live ? "among" : "not among",
                          " them)"
                        ] }) : null,
                        ". No date is promised because no date is ours to promise."
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-2 text-[11px]", style: { color: "var(--bb-text-dim)" }, children: [
                    "Verify it yourself: minter",
                    " ",
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "a",
                      {
                        href: `https://dashboard.internetcomputer.org/canister/${CK_MINTER_CANISTER_ID}`,
                        target: "_blank",
                        rel: "noopener noreferrer",
                        className: "inline-flex items-center gap-1 font-mono underline underline-offset-2",
                        style: { color: "var(--bb-brand)" },
                        children: [
                          CK_MINTER_CANISTER_ID,
                          " ",
                          /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { size: 10 })
                        ]
                      }
                    ),
                    " ",
                    "· BAT contract",
                    " ",
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "a",
                      {
                        href: `https://etherscan.io/token/${BAT_ERC20_ADDRESS}`,
                        target: "_blank",
                        rel: "noopener noreferrer",
                        className: "inline-flex items-center gap-1 font-mono underline underline-offset-2",
                        style: { color: "var(--bb-brand)" },
                        children: [
                          BAT_ERC20_ADDRESS.slice(0, 10),
                          "… ",
                          /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { size: 10 })
                        ]
                      }
                    )
                  ] })
                ] })
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 grid gap-4 sm:grid-cols-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "rounded-3xl border p-5",
              style: { borderColor: "var(--bb-border)", background: "var(--bb-surface)" },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "t-label mb-1", style: { color: "var(--bb-text-dim)" }, children: "Working today" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-bold", children: live ? "The same refinery, via UNI" : "The same refinery, via UNI" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[12px] leading-relaxed", style: { color: "var(--bb-text-muted)" }, children: live ? "BAT intake settles through the machine the UNI intake has been using on mainnet all along — same treasury, same atomic settlement, same auto-refund, same public proof page." : "Every part of this machine except the BAT door is live on mainnet — deposits, atomic settlement, withdrawals, the public proof page. BAT intake reuses it unchanged." }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    type: "button",
                    "data-ocid": "brave.open_uni",
                    onClick: onOpenUni,
                    className: "mt-3 inline-flex min-h-[40px] items-center gap-1.5 text-xs font-bold",
                    style: { color: "var(--bb-brand)" },
                    children: [
                      "Open the live app ",
                      /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { size: 13 })
                    ]
                  }
                )
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "rounded-3xl border p-5",
              style: { borderColor: "var(--bb-border)", background: "var(--bb-surface)" },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "t-label mb-1", style: { color: "var(--bb-text-dim)" }, children: "Worth knowing" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-bold", children: "Where your BAT actually lives" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[12px] leading-relaxed", style: { color: "var(--bb-text-muted)" }, children: "Brave's newer self-custody payouts settle BAT on Solana; chain-key intake starts with the Ethereum ERC-20. Small monthly amounts are cheapest to convert once accumulated — and if ICP's Solana integration reaches SPL tokens, that cost drops to cents. This page will say so plainly when either fact changes." })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4", children: live ? /* @__PURE__ */ jsxRuntimeExports.jsx(BatIntakePanel, { identity, onSignIn }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "rounded-3xl border p-6 text-center",
            style: { borderColor: "var(--bb-border)", background: "var(--bb-surface)" },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-bold mb-1", children: "One message, at launch. No newsletter." }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-4 text-[12px]", style: { color: "var(--bb-text-muted)" }, children: "Ask to be told when BAT intake opens, and that is the only email you will ever get from it." }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "a",
                {
                  href: notifyHref,
                  "data-ocid": "brave.notify",
                  className: "inline-flex min-h-[48px] items-center gap-2 rounded-2xl px-5 text-sm font-bold",
                  style: { background: "var(--royal-700)", color: "#ffffff" },
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Mail, { size: 15 }),
                    " Notify me at launch"
                  ]
                }
              )
            ]
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "footer",
          {
            className: "mt-10 border-t pt-5 text-center text-[11px]",
            style: { borderColor: "var(--bb-border)", color: "var(--bb-text-dim)" },
            children: "minegold.defi · part of the Banking.Brave ecosystem, powered by CafresoDAO"
          }
        )
      ] })
    }
  );
}
export {
  MinegoldBraveSoon
};
