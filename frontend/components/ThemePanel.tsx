"use client";

import { motion } from "framer-motion";
import { X, Palette, Check } from "lucide-react";
import { Theme } from "@/lib/types";
import { PRESETS, resolveTheme, FONT_STACKS } from "@/lib/theme";

export function ThemePanel({
  theme,
  onChange,
  onClose,
}: {
  theme: Theme | null | undefined;
  onChange: (t: Theme) => void;
  onClose: () => void;
}) {
  const current = resolveTheme(theme);

  const update = (patch: Partial<Theme>) => {
    onChange({ ...current, ...patch });
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.96, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0 }}
        className="relative bg-paper rounded-2xl p-6 w-full max-w-3xl shadow-lift border border-line max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Palette size={18} />
            <h3 className="font-display text-2xl">Design</h3>
          </div>
          <button onClick={onClose} className="text-slate2 hover:text-ink" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: controls */}
          <div className="space-y-5">
            <div>
              <label className="text-xs uppercase tracking-wider text-slate2 font-semibold">
                Presets
              </label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => onChange(p.theme)}
                    className="border border-line rounded-lg p-2 hover:border-ink text-left transition"
                    data-testid={`preset-${p.name.toLowerCase()}`}
                  >
                    <div
                      className="w-full h-12 rounded flex items-end p-1.5"
                      style={{ background: p.theme.background_color }}
                    >
                      <div
                        className="w-5 h-5 rounded"
                        style={{ background: p.theme.accent_color }}
                      />
                    </div>
                    <div className="text-xs font-medium mt-1.5">{p.name}</div>
                  </button>
                ))}
              </div>
            </div>

            <ColorField
              label="Background"
              value={current.background_color}
              onChange={(v) => update({ background_color: v })}
              testid="color-bg"
            />
            <ColorField
              label="Text"
              value={current.text_color}
              onChange={(v) => update({ text_color: v })}
              testid="color-text"
            />
            <ColorField
              label="Accent"
              value={current.accent_color}
              onChange={(v) => update({ accent_color: v })}
              testid="color-accent"
            />
            <ColorField
              label="Button"
              value={current.button_color}
              onChange={(v) => update({ button_color: v })}
              testid="color-button"
            />
            <ColorField
              label="Button text"
              value={current.button_text_color}
              onChange={(v) => update({ button_text_color: v })}
              testid="color-button-text"
            />

            <div>
              <label className="text-xs uppercase tracking-wider text-slate2 font-semibold">
                Font family
              </label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {(["serif", "sans", "mono"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => update({ font_family: f })}
                    data-testid={`font-${f}`}
                    className={
                      "border rounded-lg py-2.5 px-3 transition " +
                      (current.font_family === f
                        ? "border-ink bg-ink text-paper"
                        : "border-line hover:border-ink")
                    }
                    style={{ fontFamily: FONT_STACKS[f] }}
                  >
                    <div className="text-base">Aa</div>
                    <div className="text-[10px] uppercase tracking-wider opacity-70 mt-0.5">
                      {f}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: live preview */}
          <div
            className="rounded-xl p-6 flex flex-col justify-center min-h-[340px]"
            style={{
              background: current.background_color,
              color: current.text_color,
              fontFamily: FONT_STACKS[current.font_family],
            }}
            data-testid="theme-preview"
          >
            <div className="opacity-70 text-xs mb-3">1 → of 3</div>
            <h2 className="text-2xl md:text-3xl leading-tight mb-2">
              How was your experience?
            </h2>
            <p className="opacity-70 text-sm mb-5">Pick what fits best.</p>

            {["Loved it", "It was OK", "Not great"].map((label, i) => (
              <div
                key={label}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md mb-2 border"
                style={{
                  background:
                    i === 0
                      ? current.accent_color
                      : `color-mix(in srgb, ${current.accent_color} 10%, transparent)`,
                  borderColor:
                    i === 0
                      ? current.accent_color
                      : `color-mix(in srgb, ${current.accent_color} 40%, transparent)`,
                  color: i === 0 ? "#fff" : current.text_color,
                }}
              >
                <span
                  className="w-5 h-5 flex items-center justify-center text-[10px] rounded border"
                  style={{ borderColor: i === 0 ? "rgba(255,255,255,0.5)" : "currentColor" }}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                {label}
                {i === 0 && <Check size={14} className="ml-auto" />}
              </div>
            ))}

            <button
              className="mt-5 inline-flex items-center gap-2 self-start px-5 py-2.5 rounded-lg font-medium"
              style={{ background: current.button_color, color: current.button_text_color }}
            >
              OK ↵
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ColorField({
  label,
  value,
  onChange,
  testid,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  testid?: string;
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wider text-slate2 font-semibold">
        {label}
      </label>
      <div className="flex items-center gap-2 mt-1.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded border border-line cursor-pointer"
          data-testid={testid}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 border border-line rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-ink"
        />
      </div>
    </div>
  );
}
