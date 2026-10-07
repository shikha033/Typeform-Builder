// Theme application helpers
import { Theme } from "./types";

export const DEFAULT_THEME: Required<Theme> = {
  background_color: "#ffffff",
  text_color: "#2a222b",
  accent_color: "#a45bb8",
  button_color: "#2a222b",
  button_text_color: "#ffffff",
  font_family: "sans",
};

export function resolveTheme(t?: Theme | null): Required<Theme> {
  return { ...DEFAULT_THEME, ...(t || {}) };
}

export const FONT_STACKS: Record<Required<Theme>["font_family"], string> = {
  serif: "'Instrument Serif', 'Signifier', 'Söhne', serif",
  sans: "'Inter', ui-sans-serif, system-ui, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
};

/** Build inline-style CSS variables for a themed container. */
export function themeStyle(t?: Theme | null): React.CSSProperties {
  const r = resolveTheme(t);
  return {
    // CSS custom props consumed by children
    ["--tf-bg" as any]: r.background_color,
    ["--tf-fg" as any]: r.text_color,
    ["--tf-accent" as any]: r.accent_color,
    ["--tf-btn-bg" as any]: r.button_color,
    ["--tf-btn-fg" as any]: r.button_text_color,
    ["--tf-font" as any]: FONT_STACKS[r.font_family],
    background: r.background_color,
    color: r.text_color,
    fontFamily: FONT_STACKS[r.font_family],
  };
}

export const PRESETS: { name: string; theme: Theme }[] = [
  { name: "Classic", theme: DEFAULT_THEME },
  { name: "Plum", theme: { background_color: "#2a222b", text_color: "#ffffff", accent_color: "#d58bf0", button_color: "#d9f56b", button_text_color: "#2a222b", font_family: "sans" } },
  { name: "Coral", theme: { background_color: "#fff1ec", text_color: "#2a1310", accent_color: "#ff6b4a", button_color: "#ff6b4a", button_text_color: "#ffffff", font_family: "sans" } },
  { name: "Lime", theme: { background_color: "#f6ffd6", text_color: "#26300a", accent_color: "#7aa80f", button_color: "#2a222b", button_text_color: "#d9f56b", font_family: "sans" } },
  { name: "Ocean", theme: { background_color: "#e4efff", text_color: "#0a2540", accent_color: "#2563eb", button_color: "#2563eb", button_text_color: "#ffffff", font_family: "sans" } },
  { name: "Sunset", theme: { background_color: "#ffe9f3", text_color: "#3b0d26", accent_color: "#e0246f", button_color: "#e0246f", button_text_color: "#ffffff", font_family: "sans" } },
  { name: "Mint", theme: { background_color: "#e3f8ee", text_color: "#0f2a1f", accent_color: "#12a36b", button_color: "#0f2a1f", button_text_color: "#e3f8ee", font_family: "sans" } },
  { name: "Paper", theme: { background_color: "#faf8f3", text_color: "#2a2a2a", accent_color: "#a45bb8", button_color: "#2a2a2a", button_text_color: "#faf8f3", font_family: "serif" } },
];
