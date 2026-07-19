import { useEffect, useState } from "react";
import {
  getSettings,
  saveSettings,
  checkScreenPermission,
  checkAccessibilityPermission,
  openSystemPreferences,
  openAccessibilityPreferences,
  type AppSettings,
} from "../lib/ipc";
import { getCurrentWindow } from "@tauri-apps/api/window";

const DEFAULT_SETTINGS: AppSettings = {
  hotkeys: {
    screenshot: "CmdOrCtrl+Shift+Space",
  },
  save_directory: "",
  image_format: "png",
  show_cursor: false,
  favorite_colors: [],
};

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [hasAccessibility, setHasAccessibility] = useState<boolean | null>(null);
  const [saved, setSaved] = useState(false);

  // ウィンドウを閉じる際は hide にして再利用できるようにする
  useEffect(() => {
    const win = getCurrentWindow();
    let unlisten: (() => void) | null = null;
    win.onCloseRequested((event) => {
      event.preventDefault();
      win.hide();
    }).then((fn) => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, []);

  useEffect(() => {
    getSettings().then(setSettings).catch(console.error);
    checkScreenPermission().then(setHasPermission).catch(() => setHasPermission(false));
    checkAccessibilityPermission().then(setHasAccessibility).catch(() => setHasAccessibility(false));
  }, []);

  const handleSave = async () => {
    await saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClose = async () => {
    const win = getCurrentWindow();
    await win.hide();
  };

  return (
    <div className="flex flex-col h-screen bg-tb-base select-none">
      {/* タイトルバー */}
      <div
        className="flex items-center px-5 py-3 bg-tb-base border-b border-tb-border"
        data-tauri-drag-region
      >
        <h1 className="text-base font-semibold text-tb-text">SimpleSHOT 設定</h1>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {/* 権限 */}
        <Section title="権限">
          {/* スクリーン録画 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-tb-text">スクリーン録画</p>
              <p className="text-xs text-tb-text-sub mt-0.5">キャプチャに必要な権限です</p>
            </div>
            {hasPermission === null ? (
              <span className="text-xs text-tb-text-dim">確認中...</span>
            ) : hasPermission ? (
              <span className="text-xs font-medium text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-full">
                許可済み ✓
              </span>
            ) : (
              <button
                onClick={() => openSystemPreferences()}
                className="text-xs font-medium text-white bg-blue-500 hover:bg-blue-400 px-3 py-1.5 rounded-lg transition-colors"
              >
                権限を付与...
              </button>
            )}
          </div>
          {/* アクセシビリティ（グローバルホットキー用） */}
          <div className="flex items-center justify-between pt-2 border-t border-tb-border/50">
            <div>
              <p className="text-sm font-medium text-tb-text">アクセシビリティ</p>
              <p className="text-xs text-tb-text-sub mt-0.5">グローバルホットキーに必要な権限です</p>
            </div>
            {hasAccessibility === null ? (
              <span className="text-xs text-tb-text-dim">確認中...</span>
            ) : hasAccessibility ? (
              <span className="text-xs font-medium text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-full">
                許可済み ✓
              </span>
            ) : (
              <button
                onClick={() => openAccessibilityPreferences()}
                className="text-xs font-medium text-orange-400 bg-orange-500/15 hover:bg-orange-500/25 px-3 py-1.5 rounded-lg transition-colors"
              >
                権限を付与...
              </button>
            )}
          </div>
        </Section>

        {/* ホットキー */}
        <Section title="グローバルホットキー">
          <HotkeyRow
            label="スクリーンショット"
            value={settings.hotkeys.screenshot}
            onChange={(v) =>
              setSettings((s) => ({ ...s, hotkeys: { ...s.hotkeys, screenshot: v } }))
            }
          />
          <p className="text-xs text-tb-text-dim mt-2">
            例: CmdOrCtrl+Shift+Space, Alt+1 など
          </p>
        </Section>

        {/* 保存設定 */}
        <Section title="保存設定">
          <div className="space-y-3">
            <div>
              <label className="text-sm text-tb-text">デフォルト保存先</label>
              <input
                className="mt-1 w-full px-3 py-2 rounded-lg border border-tb-border text-sm text-tb-text focus:outline-none focus:border-blue-500 bg-tb-base placeholder:text-tb-text-dim"
                value={settings.save_directory}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, save_directory: e.target.value }))
                }
                placeholder="~/Desktop"
              />
            </div>
            <div>
              <label className="text-sm text-tb-text">画像形式</label>
              <select
                className="mt-1 w-full px-3 py-2 rounded-lg border border-tb-border text-sm text-tb-text focus:outline-none focus:border-blue-500 bg-tb-base"
                value={settings.image_format}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, image_format: e.target.value as "png" | "jpeg" }))
                }
              >
                <option value="png">PNG</option>
                <option value="jpeg">JPEG</option>
              </select>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-tb-border/50">
              <div>
                <p className="text-sm text-tb-text">カーソルを含める</p>
                <p className="text-xs text-tb-text-sub mt-0.5">スクリーンショットにマウスカーソルを表示します</p>
              </div>
              <button
                className="toggle-switch"
                role="switch"
                aria-checked={settings.show_cursor}
                aria-label="カーソルを含める"
                data-on={settings.show_cursor ? "true" : "false"}
                onClick={() => setSettings((s) => ({ ...s, show_cursor: !s.show_cursor }))}
              />
            </div>
          </div>
        </Section>
      </div>

      {/* フッター */}
      <div className="px-6 py-4 border-t border-tb-border bg-tb-base flex items-center justify-end gap-3">
        <button
          onClick={handleClose}
          className="px-4 py-2 rounded-lg text-sm text-tb-text-sub hover:bg-tb-hover hover:text-tb-text transition-colors"
        >
          キャンセル
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-400 transition-colors"
        >
          {saved ? "保存しました ✓" : "保存"}
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-xs font-semibold text-tb-text-sub uppercase tracking-wide mb-3">
        {title}
      </h2>
      <div className="bg-tb-raised rounded-xl border border-tb-border px-4 py-3 space-y-3">
        {children}
      </div>
    </div>
  );
}

function HotkeyRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-tb-text">{label}</span>
      <input
        className="px-2 py-1 rounded border border-tb-border text-sm font-mono text-tb-text w-52 focus:outline-none focus:border-blue-500 bg-tb-base"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
