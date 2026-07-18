import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import Toolbar, { type Tool } from "./Toolbar";

function createProps(overrides: Partial<ComponentProps<typeof Toolbar>> = {}) {
  const base: ComponentProps<typeof Toolbar> = {
    tool: {
      current: "arrow" as Tool,
      color: "#ff0000",
      size: 4,
      arrowStyle: "uniform",
      shapeFilled: false,
      onToolChange: vi.fn(),
      onColorChange: vi.fn(),
      onSizeChange: vi.fn(),
      onArrowStyleChange: vi.fn(),
      onShapeFilledChange: vi.fn(),
    },
    background: {
      enabled: false,
      color: "#ffffff",
      padding: 0,
      onEnabledChange: vi.fn(),
      onColorChange: vi.fn(),
      onPaddingChange: vi.fn(),
    },
    frame: {
      cornerRadius: 0,
      onCornerRadiusChange: vi.fn(),
    },
    history: {
      canUndo: false,
      canRedo: false,
      onUndo: vi.fn(),
      onRedo: vi.fn(),
    },
    crop: {
      hasRegion: false,
      canRevert: false,
      onApply: vi.fn(),
      onCancel: vi.fn(),
      onRevert: vi.fn(),
    },
    colors: {
      favorites: [],
      isPicking: false,
      onAddFavorite: vi.fn(),
      onRemoveFavorite: vi.fn(),
      onEyedrop: vi.fn(),
    },
    onCopy: vi.fn(),
    onSave: vi.fn(),
  };

  return {
    ...base,
    ...overrides,
    tool: { ...base.tool, ...overrides.tool },
    background: { ...base.background, ...overrides.background },
    frame: { ...base.frame, ...overrides.frame },
    history: { ...base.history, ...overrides.history },
    crop: { ...base.crop, ...overrides.crop },
    colors: { ...base.colors, ...overrides.colors },
  };
}

describe("Toolbar", () => {
  it("calls onToolChange when a tool button is clicked", async () => {
    const user = userEvent.setup();
    const props = createProps();
    render(<Toolbar {...props} />);

    await user.click(screen.getByTitle("ペン"));

    expect(props.tool.onToolChange).toHaveBeenCalledWith("pen");
  });

  it("disables favorite add when 8 colors are registered", () => {
    const props = createProps({
      colors: {
        favorites: [
          "#111111",
          "#222222",
          "#333333",
          "#444444",
          "#555555",
          "#666666",
          "#777777",
          "#888888",
        ],
        isPicking: false,
        onAddFavorite: vi.fn(),
        onRemoveFavorite: vi.fn(),
        onEyedrop: vi.fn(),
      },
      tool: {
        current: "arrow",
        color: "#abcdef",
        size: 4,
        arrowStyle: "uniform",
        shapeFilled: false,
        onToolChange: vi.fn(),
        onColorChange: vi.fn(),
        onSizeChange: vi.fn(),
        onArrowStyleChange: vi.fn(),
        onShapeFilledChange: vi.fn(),
      },
    });
    render(<Toolbar {...props} />);

    expect(screen.getByTitle("スロットが満杯です")).toBeDisabled();
  });

  it("disables crop Apply when there is no crop region", () => {
    const props = createProps({
      tool: {
        current: "crop",
        color: "#ff0000",
        size: 4,
        arrowStyle: "uniform",
        shapeFilled: false,
        onToolChange: vi.fn(),
        onColorChange: vi.fn(),
        onSizeChange: vi.fn(),
        onArrowStyleChange: vi.fn(),
        onShapeFilledChange: vi.fn(),
      },
      crop: {
        hasRegion: false,
        canRevert: false,
        onApply: vi.fn(),
        onCancel: vi.fn(),
        onRevert: vi.fn(),
      },
    });
    render(<Toolbar {...props} />);

    expect(screen.getByRole("button", { name: "適用" })).toBeDisabled();
  });
});
