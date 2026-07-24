import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
import { getSettings, type AppSettings } from "./ipc";

describe("ipc", () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset();
  });

  it("getSettings invokes the get_settings command", async () => {
    const settings: AppSettings = {
      hotkeys: { screenshot: "CommandOrControl+Shift+4" },
      save_directory: "/tmp",
      image_format: "png",
      show_cursor: false,
      favorite_colors: [],
      app_language: "system",
      app_appearance: "system",
    };
    vi.mocked(invoke).mockResolvedValue(settings);

    await expect(getSettings()).resolves.toEqual(settings);
    expect(invoke).toHaveBeenCalledWith("get_settings");
  });
});
