import typography from "@tailwindcss/typography";
import containerQueries from "@tailwindcss/container-queries";
import animate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["index.html", "src/**/*.{js,ts,jsx,tsx,html,css}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        // These are REAL now (I3): Fraunces + Geist + Geist Mono are
        // self-hosted as latin-subset variable woff2 in public/fonts and
        // declared @font-face in index.css. Each stack still falls back to
        // the system face, so a failed font fetch degrades to what the app
        // shipped with before rather than to a default serif.
        display: ["Fraunces", "ui-serif", "Georgia", "serif"],
        body: ["Geist", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        mono: ["'Geist Mono'", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        // I3 design tokens — defined in index.css so they're inspectable in
        // devtools and usable from inline styles; mirrored here so the same
        // values are reachable as utilities (bg-ink-800, text-royal-700,
        // text-trust-verified). One source of truth: index.css.
        royal: {
          50: "var(--royal-50)", 100: "var(--royal-100)", 200: "var(--royal-200)",
          300: "var(--royal-300)", 400: "var(--royal-400)", 500: "var(--royal-500)",
          600: "var(--royal-600)", 700: "var(--royal-700)", 800: "var(--royal-800)",
          900: "var(--royal-900)",
        },
        ink: {
          500: "var(--ink-500)", 600: "var(--ink-600)", 700: "var(--ink-700)",
          800: "var(--ink-800)", 850: "var(--ink-850)", 900: "var(--ink-900)",
          950: "var(--ink-950)",
        },
        gold: {
          200: "var(--gold-200)", 300: "var(--gold-300)", 400: "var(--gold-400)",
          500: "var(--gold-500)", 600: "var(--gold-600)", 700: "var(--gold-700)",
        },
        trust: {
          verified: "var(--trust-verified)",
          attested: "var(--trust-attested)",
          unknown: "var(--trust-unknown)",
          fault: "var(--trust-fault)",
        },
        bat: "var(--token-bat)",
        border: "oklch(var(--border))",
        input: "oklch(var(--input))",
        ring: "oklch(var(--ring) / <alpha-value>)",
        background: "oklch(var(--background))",
        foreground: "oklch(var(--foreground))",
        primary: {
          DEFAULT: "oklch(var(--primary) / <alpha-value>)",
          foreground: "oklch(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "oklch(var(--secondary) / <alpha-value>)",
          foreground: "oklch(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "oklch(var(--destructive) / <alpha-value>)",
          foreground: "oklch(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "oklch(var(--muted) / <alpha-value>)",
          foreground: "oklch(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "oklch(var(--accent) / <alpha-value>)",
          foreground: "oklch(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "oklch(var(--popover))",
          foreground: "oklch(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "oklch(var(--card))",
          foreground: "oklch(var(--card-foreground))",
        },
        gold: {
          DEFAULT: "oklch(var(--gold))",
          light: "oklch(var(--gold-light))",
          dim: "oklch(var(--gold-dim))",
        },
        navy: {
          DEFAULT: "oklch(var(--navy))",
          light: "oklch(var(--navy-light))",
        },
        chart: {
          1: "oklch(var(--chart-1))",
          2: "oklch(var(--chart-2))",
          3: "oklch(var(--chart-3))",
          4: "oklch(var(--chart-4))",
          5: "oklch(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "oklch(var(--sidebar))",
          foreground: "oklch(var(--sidebar-foreground))",
          primary: "oklch(var(--sidebar-primary))",
          "primary-foreground": "oklch(var(--sidebar-primary-foreground))",
          accent: "oklch(var(--sidebar-accent))",
          "accent-foreground": "oklch(var(--sidebar-accent-foreground))",
          border: "oklch(var(--sidebar-border))",
          ring: "oklch(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(0,0,0,0.05)",
        glow: "0 0 20px oklch(0.82 0.14 82 / 0.3)",
        "glow-lg": "0 0 40px oklch(0.82 0.14 82 / 0.2)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-gold": {
          "0%, 100%": { boxShadow: "0 0 0 0 oklch(0.82 0.14 82 / 0.4)" },
          "50%": { boxShadow: "0 0 0 8px oklch(0.82 0.14 82 / 0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 2s linear infinite",
        "pulse-gold": "pulse-gold 2s ease-in-out infinite",
        float: "float 4s ease-in-out infinite",
      },
    },
  },
  plugins: [typography, containerQueries, animate],
};
