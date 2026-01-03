import { useState, useEffect } from "react";
import { Palette, Check, RotateCcw } from "lucide-react";

interface ThemeColors {
  primary: string;
  background: string;
  card: string;
  text: string;
  muted: string;
  accent: string;
}

interface ThemePreset {
  name: string;
  colors: ThemeColors;
}

const PRESETS: ThemePreset[] = [
  {
    name: "Nexus Default",
    colors: {
      primary: "#8b5cf6",
      background: "#09090b",
      card: "#18181b",
      text: "#fafafa",
      muted: "#71717a",
      accent: "#a78bfa",
    },
  },
  {
    name: "Ocean Blue",
    colors: {
      primary: "#0ea5e9",
      background: "#0c1222",
      card: "#1e293b",
      text: "#f1f5f9",
      muted: "#64748b",
      accent: "#38bdf8",
    },
  },
  {
    name: "Forest Green",
    colors: {
      primary: "#22c55e",
      background: "#0a0f0d",
      card: "#14231a",
      text: "#f0fdf4",
      muted: "#6b7280",
      accent: "#4ade80",
    },
  },
  {
    name: "Sunset Orange",
    colors: {
      primary: "#f97316",
      background: "#0f0906",
      card: "#1c1410",
      text: "#fff7ed",
      muted: "#78716c",
      accent: "#fb923c",
    },
  },
  {
    name: "Rose Pink",
    colors: {
      primary: "#ec4899",
      background: "#0f0609",
      card: "#1c1015",
      text: "#fdf2f8",
      muted: "#9ca3af",
      accent: "#f472b6",
    },
  },
  {
    name: "Monochrome",
    colors: {
      primary: "#a3a3a3",
      background: "#0a0a0a",
      card: "#171717",
      text: "#fafafa",
      muted: "#737373",
      accent: "#d4d4d4",
    },
  },
];

const STORAGE_KEY = "nexus_custom_theme";

export function useCustomTheme(): {
  colors: ThemeColors;
  setColors: (colors: ThemeColors) => void;
  applyTheme: (colors: ThemeColors) => void;
  resetTheme: () => void;
} {
  const [colors, setColorsState] = useState<ThemeColors>(PRESETS[0].colors);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      setColorsState(parsed);
      applyTheme(parsed);
    }
  }, []);

  const applyTheme = (newColors: ThemeColors): void => {
    const root = document.documentElement;
    root.style.setProperty("--nexus-primary", newColors.primary);
    root.style.setProperty("--background", newColors.background);
    root.style.setProperty("--card", newColors.card);
    root.style.setProperty("--foreground", newColors.text);
    root.style.setProperty("--muted-foreground", newColors.muted);
    root.style.setProperty("--nexus-accent", newColors.accent);
  };

  const setColors = (newColors: ThemeColors): void => {
    setColorsState(newColors);
    applyTheme(newColors);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newColors));
  };

  const resetTheme = (): void => {
    setColors(PRESETS[0].colors);
  };

  return { colors, setColors, applyTheme, resetTheme };
}

interface ThemeCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ThemeCustomizer({
  isOpen,
  onClose,
}: ThemeCustomizerProps): React.ReactElement | null {
  const { colors, setColors, resetTheme } = useCustomTheme();
  const [activePreset, setActivePreset] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePresetSelect = (preset: ThemePreset): void => {
    setColors(preset.colors);
    setActivePreset(preset.name);
  };

  const handleColorChange = (key: keyof ThemeColors, value: string): void => {
    setColors({ ...colors, [key]: value });
    setActivePreset(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-card rounded-xl shadow-2xl border border-border w-full max-w-lg max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Palette size={20} />
            Theme Customizer
          </h2>
          <button
            onClick={resetTheme}
            className="p-2 hover:bg-muted rounded text-muted-foreground"
            title="Reset to default"
          >
            <RotateCcw size={18} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh] space-y-6">
          {/* Presets */}
          <div>
            <h3 className="text-sm font-medium mb-3">Presets</h3>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handlePresetSelect(preset)}
                  className={`p-3 rounded-lg border transition-colors text-left ${
                    activePreset === preset.name
                      ? "border-nexus-500 bg-nexus-500/10"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: preset.colors.primary }}
                    />
                    {activePreset === preset.name && (
                      <Check size={14} className="text-nexus-500" />
                    )}
                  </div>
                  <span className="text-xs">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Colors */}
          <div>
            <h3 className="text-sm font-medium mb-3">Custom Colors</h3>
            <div className="space-y-3">
              {(Object.keys(colors) as Array<keyof ThemeColors>).map((key) => (
                <div key={key} className="flex items-center justify-between">
                  <label className="text-sm capitalize">{key}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={colors[key]}
                      onChange={(e) => handleColorChange(key, e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border border-border"
                    />
                    <input
                      type="text"
                      value={colors[key]}
                      onChange={(e) => handleColorChange(key, e.target.value)}
                      className="w-24 px-2 py-1 bg-muted rounded text-xs font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div>
            <h3 className="text-sm font-medium mb-3">Preview</h3>
            <div
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: colors.card,
                borderColor: colors.muted,
              }}
            >
              <p style={{ color: colors.text }} className="mb-2">
                This is preview text
              </p>
              <p style={{ color: colors.muted }} className="text-sm mb-3">
                This is muted text
              </p>
              <button
                style={{ backgroundColor: colors.primary }}
                className="px-4 py-2 rounded text-white text-sm"
              >
                Primary Button
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end p-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-nexus-500 text-white rounded-lg hover:bg-nexus-600"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
