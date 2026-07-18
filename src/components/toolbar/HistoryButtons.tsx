import { UndoIcon, RedoIcon } from "./icons";
import { BTN_DEFAULT } from "./styles";

interface HistoryButtonsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export function HistoryButtons({ canUndo, canRedo, onUndo, onRedo }: HistoryButtonsProps) {
  return (
    <div className="tool-group">
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className={`${BTN_DEFAULT} disabled:opacity-20`}
        title="元に戻す (⌘Z)"
      >
        <UndoIcon />
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className={`${BTN_DEFAULT} disabled:opacity-20`}
        title="やり直し (⌘⇧Z)"
      >
        <RedoIcon />
      </button>
    </div>
  );
}
