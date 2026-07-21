import { useLocalization } from "../../lib/localization";

interface ActionButtonsProps {
  onCopy: () => void;
  onSave: () => void;
}

export function ActionButtons({ onCopy, onSave }: ActionButtonsProps) {
  const { t } = useLocalization();
  return (
    <div className="ml-auto flex gap-2 flex-shrink-0">
      <button
        onClick={onCopy}
        className="px-4 py-2 rounded-lg text-[13px] font-medium text-tb-text bg-tb-raised border border-tb-border hover:bg-tb-hover transition-all duration-150 active:scale-[0.97]"
      >
        {t("Copy", "コピー")}
      </button>
      <button
        onClick={onSave}
        className="px-5 py-2 rounded-lg text-[13px] font-semibold text-tb-base bg-tb-text hover:opacity-90 transition-opacity duration-150 active:scale-[0.97]"
      >
        {t("Save", "保存")}
      </button>
    </div>
  );
}
