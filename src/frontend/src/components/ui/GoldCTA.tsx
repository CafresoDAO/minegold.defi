/**
 * GoldCTA — the Banking.Brave primary action button.
 *
 * The site previously had the same yellow-gradient button written inline in
 * seven places with cosmetic drift (h-12 vs h-14 vs min-h-[64px], some with
 * shimmer, some without, inconsistent focus rings, inconsistent disabled
 * styling). This component collapses all variants behind one API so the
 * visual language of the primary CTA is consistent across the dapp.
 *
 * Not for every button — the generic shadcn `<Button>` stays for utility
 * actions. `<GoldCTA>` is specifically the product's hero action: Mine,
 * Sign in, Connect Wallet, Claim, Continue.
 *
 * Design contract:
 *   - tone=primary   → gradient gold → amber, black text, glow shadow
 *   - tone=ghost     → transparent surface, gold border + text
 *   - tone=danger    → gradient red → rose, white text
 *   - size=md        → 48-52px min-height, text-sm
 *   - size=lg        → 64-72px min-height, text-base → text-xl
 *   - loading        → swaps leading icon for spinner, sets aria-busy,
 *                      disables clicks, preserves layout width
 *   - shimmer=true   → adds the hover sweep effect previously inline on
 *                      the main Mine CTA only (default true for primary lg)
 *   - leadingIcon    → optional; auto-sized to 18 (md) / 22 (lg) px
 *   - trailingIcon   → optional; same sizing. Default on lg primary is a
 *                      ChevronRight that slides right on hover.
 *
 * Accessibility:
 *   - role=button (native)
 *   - aria-busy when loading
 *   - focus-visible ring matches tone color; 2px offset from the button
 *   - disabled collapses to a dead gray — identical between primary/ghost
 *     so users can't mistake a disabled gold CTA for an enabled one
 */
import { type VariantProps, cva } from "class-variance-authority";
import { ChevronRight, Loader2 } from "lucide-react";
import { cloneElement, isValidElement } from "react";
import type * as React from "react";
import { cn } from "../../lib/utils";

const goldCtaVariants = cva(
  // base: flex layout, transitions, consistent disabled state, focus ring
  "group relative inline-flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap font-bold transition-all select-none active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:active:scale-100",
  {
    variants: {
      tone: {
        primary:
          "bg-gradient-to-r from-yellow-500 to-amber-400 hover:from-yellow-400 hover:to-amber-300 text-black shadow-lg shadow-yellow-500/20 focus-visible:outline-yellow-300 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-500 disabled:shadow-none",
        ghost:
          "bg-transparent border border-yellow-500/60 text-yellow-300 hover:bg-yellow-500/10 hover:border-yellow-400 focus-visible:outline-yellow-300 disabled:border-zinc-800 disabled:text-zinc-600",
        /* neutral — secondary/utility buttons alongside a primary. Used for
         * Cancel, Check now, Try Again, Dismiss — anywhere a button needs
         * to coexist with a gold primary without competing for attention. */
        neutral:
          "bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600 text-zinc-200 focus-visible:outline-zinc-500 disabled:bg-zinc-900 disabled:border-zinc-800 disabled:text-zinc-600",
        /* info — used for recovery/secondary positive actions that shouldn't
         * read as the primary gold CTA but still signal forward motion. */
        info:
          "bg-blue-500/15 border border-blue-500/30 hover:bg-blue-500/25 hover:border-blue-400/50 text-blue-200 focus-visible:outline-blue-400 disabled:bg-zinc-900 disabled:border-zinc-800 disabled:text-zinc-600",
        danger:
          "bg-gradient-to-r from-red-500 to-rose-400 hover:from-red-400 hover:to-rose-300 text-white shadow-lg shadow-red-500/20 focus-visible:outline-red-300 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-500 disabled:shadow-none",
      },
      size: {
        md: "min-h-[48px] sm:min-h-[52px] rounded-xl px-5 text-sm",
        lg: "min-h-[64px] md:min-h-[72px] rounded-2xl px-6 text-base md:text-lg",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      tone: "primary",
      size: "md",
      fullWidth: true,
    },
  },
);

type ButtonProps = Omit<React.ComponentProps<"button">, "children">;

export type GoldCTAProps = ButtonProps &
  VariantProps<typeof goldCtaVariants> & {
    /** The visible label. If you need icon-only, pass a sr-only span instead. */
    children: React.ReactNode;
    /** Spinner replaces `leadingIcon` and disables pointer events. */
    loading?: boolean;
    /** Shown before the label. Auto-sized per size variant. */
    leadingIcon?: React.ReactNode;
    /** Shown after the label. Defaults to ChevronRight on `tone=primary size=lg`. */
    trailingIcon?: React.ReactNode;
    /** Adds the hover shimmer sweep. Default true for primary/lg. */
    shimmer?: boolean;
  };

/** Wraps a Lucide-like icon node, forcing a consistent size per CTA size.
 *  Lucide icons honor a `size` prop; other elements fall through unchanged. */
function IconSlot({
  node,
  sizePx,
  className,
}: {
  node: React.ReactNode;
  sizePx: number;
  className?: string;
}) {
  if (!node) return null;
  if (isValidElement(node)) {
    const el = node as React.ReactElement<{ size?: number; className?: string }>;
    return cloneElement(el, {
      size: sizePx,
      className: cn(el.props?.className, className),
    });
  }
  return <span className={className}>{node}</span>;
}

export function GoldCTA({
  tone = "primary",
  size = "md",
  fullWidth = true,
  loading = false,
  disabled,
  leadingIcon,
  trailingIcon,
  shimmer,
  className,
  children,
  type = "button",
  ...rest
}: GoldCTAProps) {
  const isDisabled = disabled || loading;
  const iconSize = size === "lg" ? 22 : 18;
  const showShimmer = shimmer ?? (tone === "primary" && size === "lg");

  // Default trailing icon = ChevronRight for primary lg, animated on hover.
  // Only fill the default when the caller didn't mention trailingIcon at all
  // (prop === undefined). An explicit `trailingIcon={null}` means "suppress",
  // so respect that — otherwise lg primaries couldn't opt out of the chevron.
  const resolvedTrailing =
    trailingIcon !== undefined
      ? trailingIcon
      : tone === "primary" && size === "lg"
        ? (
            <ChevronRight
              size={24}
              className="transition-transform group-hover:translate-x-1"
              aria-hidden
            />
          )
        : null;

  // Leading = spinner when loading, else user-provided
  const resolvedLeading = loading ? (
    <Loader2 size={iconSize} className="animate-spin" aria-hidden />
  ) : (
    <IconSlot node={leadingIcon} sizePx={iconSize} />
  );

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(goldCtaVariants({ tone, size, fullWidth }), className)}
      {...rest}
    >
      {/* Hover shimmer sweep — subtle highlight for the hero CTA only */}
      {showShimmer && !isDisabled && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full"
        />
      )}
      <span className="relative z-10 inline-flex items-center justify-center gap-2 md:gap-3">
        {resolvedLeading}
        <span>{children}</span>
        {resolvedTrailing && (
          <IconSlot node={resolvedTrailing} sizePx={size === "lg" ? 24 : 18} />
        )}
      </span>
    </button>
  );
}
