/**
 * Haptic feedback for the mining flow — pocket the phone and FEEL your money
 * confirm. navigator.vibrate is Android-only (iOS Safari has no Vibration
 * API), so every call silently no-ops elsewhere; reduced-motion users are
 * respected too.
 */
const canVibrate = (): boolean => {
  try {
    return (
      typeof navigator !== "undefined" &&
      "vibrate" in navigator &&
      !window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
    );
  } catch {
    return false;
  }
};

// Pocket rule: no per-block buzzing while the tab is hidden (it reads as a
// broken notification), but progress made in the background shouldn't pass
// silently either — the first return to the tab gets ONE milestone buzz if
// any ticks were swallowed.
let ticksSuppressedWhileHidden = false;
try {
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && ticksSuppressedWhileHidden) {
      ticksSuppressedWhileHidden = false;
      if (canVibrate()) navigator.vibrate([30, 40, 30]);
    }
  });
} catch {
  /* non-DOM environment */
}

/** One pick strike — a single Ethereum block confirmed. */
export const hapticTick = (): void => {
  if (typeof document !== "undefined" && document.hidden) {
    ticksSuppressedWhileHidden = true;
    return;
  }
  if (canVibrate()) navigator.vibrate(18);
};

/** Crossing the chain-key seam — ckUNI landed in the user's account. */
export const hapticMilestone = (): void => {
  if (canVibrate()) navigator.vibrate([30, 40, 30]);
};

/** Gold struck — sGLDT released. */
export const hapticSuccess = (): void => {
  if (canVibrate()) navigator.vibrate([25, 50, 25, 50, 80]);
};

/** Something went wrong — one long buzz, distinct from the strike rhythm. */
export const hapticFailure = (): void => {
  if (canVibrate()) navigator.vibrate(200);
};
