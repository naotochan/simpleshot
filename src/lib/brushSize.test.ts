import { describe, it, expect } from "vitest";
import {
  BRUSH_SIZE_DEFAULT,
  BRUSH_SIZE_MAX,
  BRUSH_SIZE_MIN,
  textSizeFromBrush,
} from "./brushSize";

describe("brushSize", () => {
  it("keeps a useful image-pixel range", () => {
    expect(BRUSH_SIZE_MIN).toBe(1);
    expect(BRUSH_SIZE_MAX).toBeGreaterThanOrEqual(20);
    expect(BRUSH_SIZE_DEFAULT).toBeGreaterThanOrEqual(BRUSH_SIZE_MIN);
    expect(BRUSH_SIZE_DEFAULT).toBeLessThanOrEqual(BRUSH_SIZE_MAX);
  });

  it("maps brush size to text font size in native pixels", () => {
    expect(textSizeFromBrush(1)).toBe(18);
    expect(textSizeFromBrush(4)).toBe(36);
    expect(textSizeFromBrush(10)).toBe(72);
  });
});
