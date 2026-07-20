import { describe, it, expect } from "vitest";
import {
  BRUSH_SIZE_DEFAULT,
  BRUSH_SIZE_MAX,
  BRUSH_SIZE_MIN,
  brushPreviewDiameter,
  effectiveSizeFromBrush,
  highlighterWidthFromBrush,
  mosaicBlockFromBrush,
  shouldShowSizeControl,
  textSizeFromBrush,
} from "./brushSize";

describe("brushSize", () => {
  it("keeps a useful image-pixel range", () => {
    expect(BRUSH_SIZE_MIN).toBe(1);
    expect(BRUSH_SIZE_MAX).toBeGreaterThanOrEqual(20);
    expect(BRUSH_SIZE_DEFAULT).toBeGreaterThanOrEqual(BRUSH_SIZE_MIN);
    expect(BRUSH_SIZE_DEFAULT).toBeLessThanOrEqual(BRUSH_SIZE_MAX);
  });

  it("maps brush size to tool-specific effective sizes", () => {
    expect(textSizeFromBrush(1)).toBe(18);
    expect(textSizeFromBrush(4)).toBe(36);
    expect(highlighterWidthFromBrush(4)).toBe(32);
    expect(mosaicBlockFromBrush(4)).toBe(10);
    expect(effectiveSizeFromBrush("pen", 4)).toBe(4);
    expect(effectiveSizeFromBrush("highlighter", 4)).toBe(32);
  });

  it("hides size control for hand, crop, and filled shapes", () => {
    expect(shouldShowSizeControl("hand", false)).toBe(false);
    expect(shouldShowSizeControl("crop", false)).toBe(false);
    expect(shouldShowSizeControl("rect", true)).toBe(false);
    expect(shouldShowSizeControl("rect", false)).toBe(true);
    expect(shouldShowSizeControl("pen", false)).toBe(true);
  });

  it("returns brush preview diameter only when useful", () => {
    expect(brushPreviewDiameter("pen", 4, false)).toBe(4);
    expect(brushPreviewDiameter("highlighter", 4, false)).toBe(32);
    expect(brushPreviewDiameter("hand", 4, false)).toBeNull();
    expect(brushPreviewDiameter("rect", 4, true)).toBeNull();
    expect(brushPreviewDiameter("mosaic", 4, false)).toBeNull();
  });
});
