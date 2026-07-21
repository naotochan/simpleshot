import { UndoIcon, RedoIcon } from "./icons";
import { BTN_DEFAULT } from "./styles";
import { useLocalization } from "../../lib/localization";

interface HistoryButtonsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export function HistoryButtons({ canUndo, canRedo, onUndo, onRedo }: HistoryButtonsProps) {
  const { t } = useLocalization();
  return (
    <div className="tool-group">
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className={`${BTN_DEFAULT} disabled:opacity-20`}
        title={t("Undo (⌘Z)", "元に戻す (⌘Z)")}
        aria-label={t("Undo", "元に戻す")}
      >
        <UndoIcon />
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className={`${BTN_DEFAULT} disabled:opacity-20`}
        title={t("Redo (⌘⇧Z)", "やり直し (⌘⇧Z)")}
        aria-label={t("Redo", "やり直し")}
      >
        <RedoIcon />
      </button>
    </div>
  );
}
