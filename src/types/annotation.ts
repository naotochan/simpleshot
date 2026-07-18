export type Tool =
  | "arrow"
  | "text"
  | "rect"
  | "ellipse"
  | "pen"
  | "highlighter"
  | "mosaic"
  | "crop"
  | "hand";

export type AnnotationColor = string;
export type ArrowStyle = "uniform" | "tapered";

export interface Point {
  x: number;
  y: number;
}

export interface Annotation {
  tool: Tool;
  color: AnnotationColor;
  size: number;
  points: Point[];
  text?: string;
  arrowStyle?: ArrowStyle;
  filled?: boolean;
}
