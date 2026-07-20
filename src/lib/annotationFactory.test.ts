import { describe, it, expect } from "vitest";
import { createDrawingAnnotation, shiftAnnotation, withUpdatedPoints } from "./annotationFactory";

describe("annotationFactory", () => {
  it("creates discriminated annotations with effective sizes", () => {
    const arrow = createDrawingAnnotation({
      tool: "arrow",
      color: "#ff0000",
      brushSize: 4,
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ],
      arrowStyle: "tapered",
      shapeFilled: false,
    });
    expect(arrow).toMatchObject({ tool: "arrow", size: 4, arrowStyle: "tapered" });

    const hi = createDrawingAnnotation({
      tool: "highlighter",
      color: "#ffff00",
      brushSize: 4,
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
      arrowStyle: "uniform",
      shapeFilled: false,
    });
    expect(hi).toMatchObject({ tool: "highlighter", size: 32 });

    const rect = createDrawingAnnotation({
      tool: "rect",
      color: "#00ff00",
      brushSize: 3,
      points: [
        { x: 0, y: 0 },
        { x: 5, y: 5 },
      ],
      arrowStyle: "uniform",
      shapeFilled: true,
    });
    expect(rect).toMatchObject({ tool: "rect", filled: true, size: 3 });
  });

  it("updates points and shifts coordinates while preserving discriminant", () => {
    const pen = createDrawingAnnotation({
      tool: "pen",
      color: "#000",
      brushSize: 2,
      points: [{ x: 10, y: 20 }],
      arrowStyle: "uniform",
      shapeFilled: false,
    });
    const moved = withUpdatedPoints(pen, [
      { x: 10, y: 20 },
      { x: 30, y: 40 },
    ]);
    expect(moved.tool).toBe("pen");
    expect(moved.points).toHaveLength(2);

    const shifted = shiftAnnotation(moved, 5, 5);
    expect(shifted.points[0]).toEqual({ x: 5, y: 15 });
  });
});
