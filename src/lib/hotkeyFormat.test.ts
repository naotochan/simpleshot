import { describe, it, expect } from "vitest";
import {
  DEFAULT_SCREENSHOT_HOTKEY,
  formatHotkeyMac,
  normalizeHotkeyAccelerator,
} from "./hotkeyFormat";

describe("formatHotkeyMac", () => {
  it("formats the default accelerator with macOS symbols", () => {
    expect(formatHotkeyMac("Command+Shift+Space")).toBe("⌘⇧Space");
    expect(formatHotkeyMac("CmdOrCtrl+Shift+Space")).toBe("⌘⇧Space");
  });

  it("formats option and control", () => {
    expect(formatHotkeyMac("Option+Shift+S")).toBe("⌥⇧S");
    expect(formatHotkeyMac("Control+Alt+A")).toBe("⌃⌥A");
  });
});

describe("normalizeHotkeyAccelerator", () => {
  it("normalizes casual macOS input", () => {
    expect(normalizeHotkeyAccelerator("cmd + shift + space")).toBe(
      DEFAULT_SCREENSHOT_HOTKEY
    );
    expect(normalizeHotkeyAccelerator("⌘⇧Space")).toBe(DEFAULT_SCREENSHOT_HOTKEY);
    expect(normalizeHotkeyAccelerator("Command+Shift+Space")).toBe(
      DEFAULT_SCREENSHOT_HOTKEY
    );
  });

  it("keeps CmdOrCtrl as Command on this macOS app", () => {
    expect(normalizeHotkeyAccelerator("CmdOrCtrl+Shift+Space")).toBe(
      "Command+Shift+Space"
    );
  });
});
