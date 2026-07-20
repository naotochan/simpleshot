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

/** 描画結果としてキャンバスに残るツール（crop / hand は含まない） */
export type AnnotationTool = Exclude<Tool, "crop" | "hand">;

export type AnnotationColor = string;
export type ArrowStyle = "uniform" | "tapered";

export interface Point {
  x: number;
  y: number;
}

interface AnnotationBase {
  color: AnnotationColor;
  /** 画像の native 画素での実効サイズ（線幅 / フォント / モザイクブロック） */
  size: number;
  points: Point[];
}

export interface ArrowAnnotation extends AnnotationBase {
  tool: "arrow";
  arrowStyle: ArrowStyle;
}

export interface TextAnnotation extends AnnotationBase {
  tool: "text";
  text: string;
}

export interface RectAnnotation extends AnnotationBase {
  tool: "rect";
  filled: boolean;
}

export interface EllipseAnnotation extends AnnotationBase {
  tool: "ellipse";
  filled: boolean;
}

export interface PenAnnotation extends AnnotationBase {
  tool: "pen";
}

export interface HighlighterAnnotation extends AnnotationBase {
  tool: "highlighter";
}

export interface MosaicAnnotation extends AnnotationBase {
  tool: "mosaic";
}

export type Annotation =
  | ArrowAnnotation
  | TextAnnotation
  | RectAnnotation
  | EllipseAnnotation
  | PenAnnotation
  | HighlighterAnnotation
  | MosaicAnnotation;

export function isStrokeTool(tool: Tool): tool is "arrow" | "pen" | "rect" | "ellipse" {
  return tool === "arrow" || tool === "pen" || tool === "rect" || tool === "ellipse";
}

export function isShapeTool(tool: Tool): tool is "rect" | "ellipse" {
  return tool === "rect" || tool === "ellipse";
}
