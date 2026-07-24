/**
 * macOS-facing hotkey helpers.
 * Storage stays Tauri accelerator form (e.g. Command+Shift+Space).
 */

/** Canonical default for this macOS-only app. */
export const DEFAULT_SCREENSHOT_HOTKEY = "Command+Shift+Space";

/** Pretty macOS label: Command+Shift+Space → ⌘⇧Space */
export function formatHotkeyMac(accelerator: string): string {
  const parts = accelerator
    .split("+")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const lower = p.toLowerCase();
      if (
        lower === "cmdorctrl" ||
        lower === "commandorcontrol" ||
        lower === "command" ||
        lower === "cmd" ||
        lower === "⌘"
      ) {
        return "⌘";
      }
      if (lower === "control" || lower === "ctrl" || lower === "⌃") return "⌃";
      if (lower === "option" || lower === "alt" || lower === "⌥") return "⌥";
      if (lower === "shift" || lower === "⇧") return "⇧";
      if (lower === "space") return "Space";
      if (lower === "return" || lower === "enter") return "↩";
      if (lower === "escape" || lower === "esc") return "Esc";
      // Single letter / F-keys: Title case
      if (/^f\d{1,2}$/i.test(p)) return p.toUpperCase();
      if (p.length === 1) return p.toUpperCase();
      return p;
    });

  // Apple menu style: symbols and key jammed (⌘⇧Space, ⌥⇧S)
  return parts.join("");
}

/**
 * Accept user input in either Tauri form or casual macOS form
 * (cmd+shift+space, ⌘⇧Space, Command+Shift+Space) → Command+…
 */
export function normalizeHotkeyAccelerator(raw: string): string {
  const cleaned = raw.trim().replace(/\s*\+\s*/g, "+").replace(/\s+/g, "+");
  if (!cleaned) return DEFAULT_SCREENSHOT_HOTKEY;

  // Expand glued symbols: ⌘⇧Space → ⌘+⇧+Space
  const expanded = cleaned
    .replace(/⌘/g, "⌘+")
    .replace(/⌃/g, "⌃+")
    .replace(/⌥/g, "⌥+")
    .replace(/⇧/g, "⇧+")
    .replace(/\+\+/g, "+")
    .replace(/\+$/g, "");

  return expanded
    .split("+")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const lower = p.toLowerCase();
      if (
        lower === "cmdorctrl" ||
        lower === "commandorcontrol" ||
        lower === "command" ||
        lower === "cmd" ||
        p === "⌘"
      ) {
        return "Command";
      }
      if (lower === "control" || lower === "ctrl" || p === "⌃") return "Control";
      if (lower === "option" || lower === "alt" || p === "⌥") return "Option";
      if (lower === "shift" || p === "⇧") return "Shift";
      if (lower === "space") return "Space";
      if (lower === "return" || lower === "enter" || p === "↩") return "Return";
      if (lower === "escape" || lower === "esc") return "Escape";
      if (/^f\d{1,2}$/i.test(p)) return p.toUpperCase();
      if (p.length === 1) return p.toUpperCase();
      return p.charAt(0).toUpperCase() + p.slice(1);
    })
    .join("+");
}
