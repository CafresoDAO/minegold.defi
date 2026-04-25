/**
 * Device / browser detection.
 *
 * iOS is a hard constraint for Web3: Apple forbids wallet browser extensions
 * in Mobile Safari and Mobile Chrome, and Brave on iOS inherits that rule.
 * The only on-device path to sign an Ethereum tx on iPhone/iPad is inside a
 * wallet app's in-app browser (Brave Wallet, MetaMask Mobile, Trust Wallet,
 * Rainbow — all expose one). Regular Brave on iOS has no window.ethereum.
 *
 * `maxTouchPoints > 1` on MacIntel catches iPad Safari in "Request Desktop
 * Site" mode, which spoofs Mac UA — without this check those iPads look like
 * desktop and fall through the wrong branch.
 */

const UA = typeof navigator !== "undefined" ? navigator.userAgent : "";
const PLATFORM = typeof navigator !== "undefined" ? navigator.platform : "";
const MAX_TOUCH =
  typeof navigator !== "undefined" ? navigator.maxTouchPoints : 0;

export const isIOS =
  /iPhone|iPad|iPod/i.test(UA) || (PLATFORM === "MacIntel" && MAX_TOUCH > 1);

export const isAndroid = /Android/i.test(UA);

export const isMobile =
  /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(UA);

/** True when we're running inside a wallet's in-app browser (which injects
 *  window.ethereum). Useful for UX copy that tells the user what to do next. */
export function hasInjectedWallet(): boolean {
  if (typeof window === "undefined") return false;
  // biome-ignore lint/suspicious/noExplicitAny: window.ethereum shape
  return !!(window as any).ethereum;
}
