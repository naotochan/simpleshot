import { useMemo, type ReactNode } from "react";
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
import { useLocalization } from "../../lib/localization";

interface ToolSelectorProps {
  current: Tool;
  onChange: (t: Tool) => void;
}

export function ToolSelector({ current, onChange }: ToolSelectorProps) {
  const { t } = useLocalization();

  const tools: { id: Tool; label: string; icon: ReactNode }[] = useMemo(
    () => [
      { id: "arrow", label: t("Arrow", "矢印"), icon: <ArrowIcon /> },
      { id: "text", label: t("Text", "テキスト"), icon: <TextIcon /> },
      { id: "rect", label: t("Rectangle", "矩形"), icon: <RectIcon /> },
      { id: "ellipse", label: t("Ellipse", "楕円"), icon: <EllipseIcon /> },
      { id: "pen", label: t("Pen", "ペン"), icon: <PencilIcon /> },
      { id: "highlighter", label: t("Highlight", "ハイライト"), icon: <HighlighterIcon /> },
      { id: "mosaic", label: t("Mosaic", "モザイク"), icon: <MosaicIcon /> },
      { id: "crop", label: t("Crop", "トリミング"), icon: <CropIcon /> },
      { id: "hand", label: t("Pan", "手のひら"), icon: <HandIcon /> },
    ],
    [t]
  );

  return (
    <div className="tool-group">
      {tools.map((tool) => (
        <button
          key={tool.id}
          title={tool.label}
          aria-label={tool.label}
          onClick={() => onChange(tool.id)}
          className={current === tool.id ? BTN_SELECTED : BTN_DEFAULT}
        >
          {tool.icon}
        </button>
      ))}
    </div>
  );
}
