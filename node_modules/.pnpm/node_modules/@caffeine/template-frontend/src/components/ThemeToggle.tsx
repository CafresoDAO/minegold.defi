import { Moon, Sun } from "lucide-react";
import { useTheme } from "../hooks/useTheme";

/** Circular light/dark toggle. Lives in the top-right on both the
 * Banking.Brave landing and the minegold.defi nav. Uses CSS variables
 * so its colors always match whichever theme is active. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const isLight = theme === "light";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${isLight ? "dark" : "light"} mode`}
      title={`Switch to ${isLight ? "dark" : "light"} mode`}
      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${className}`}
      style={{
        background: "var(--bb-surface)",
        border: "1px solid var(--bb-border)",
        color: "var(--bb-text)",
      }}
    >
      {isLight ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}
