interface SizeControlProps {
  size: number;
  onChange: (s: number) => void;
}

export function SizeControl({ size, onChange }: SizeControlProps) {
  return (
    <div className="tool-group">
      <span className="text-[11px] font-medium text-tb-text-sub tracking-wide uppercase px-1">太さ</span>
      <input
        type="range"
        min={1}
        max={20}
        value={size}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider-tb w-24"
      />
      <input
        type="number"
        min={1}
        max={20}
        value={size}
        onChange={(e) => {
          const v = Math.max(1, Math.min(20, Number(e.target.value) || 1));
          onChange(v);
        }}
        className="w-10 bg-tb-base text-tb-text text-[11px] font-mono tabular-nums text-center rounded-md border border-tb-border px-1 py-0.5 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
    </div>
  );
}
