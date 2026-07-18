interface ActionButtonsProps {
  onCopy: () => void;
  onSave: () => void;
}

export function ActionButtons({ onCopy, onSave }: ActionButtonsProps) {
  return (
    <div className="ml-auto flex gap-2 flex-shrink-0">
      <button
        onClick={onCopy}
        className="px-4 py-2 rounded-lg text-[13px] font-medium text-tb-text bg-tb-raised border border-tb-border hover:bg-tb-hover transition-all duration-150 active:scale-[0.97]"
      >
        コピー
      </button>
      <button
        onClick={onSave}
        className="px-5 py-2 rounded-lg text-[13px] font-semibold text-white bg-tb-success hover:brightness-110 shadow-[0_0_12px_rgba(34,197,94,0.2)] transition-all duration-150 active:scale-[0.97]"
      >
        保存
      </button>
    </div>
  );
}
