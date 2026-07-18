import type { ReactNode } from "react";
import type { Tool } from "../../types/annotation";
import {
  ArrowIcon,
  TextIcon,
  RectIcon,
  EllipseIcon,
  PencilIcon,
  HighlighterIcon,
  MosaicIcon,
  CropIcon,
  HandIcon,
} from "./icons";
import { BTN_DEFAULT, BTN_SELECTED } from "./styles";

const TOOLS: { id: Tool; label: string; icon: ReactNode }[] = [
  { id: "arrow", label: "矢印", icon: <ArrowIcon /> },
  { id: "text", label: "テキスト", icon: <TextIcon /> },
  { id: "rect", label: "矩形", icon: <RectIcon /> },
  { id: "ellipse", label: "楕円", icon: <EllipseIcon /> },
  { id: "pen", label: "ペン", icon: <PencilIcon /> },
  { id: "highlighter", label: "ハイライト", icon: <HighlighterIcon /> },
  { id: "mosaic", label: "モザイク", icon: <MosaicIcon /> },
  { id: "crop", label: "トリミング", icon: <CropIcon /> },
  { id: "hand", label: "手のひら", icon: <HandIcon /> },
];

interface ToolSelectorProps {
  current: Tool;
  onChange: (t: Tool) => void;
}

export function ToolSelector({ current, onChange }: ToolSelectorProps) {
  return (
    <div className="tool-group">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          title={t.label}
          onClick={() => onChange(t.id)}
          className={current === t.id ? BTN_SELECTED : BTN_DEFAULT}
        >
          {t.icon}
        </button>
      ))}
    </div>
  );
}
