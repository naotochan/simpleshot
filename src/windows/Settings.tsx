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
    <div className="flex flex-col h-screen bg-gray-50 select-none">
      {/* タイトルバー */}
      <div
        className="flex items-center px-5 py-3 bg-white border-b border-gray-200"
        data-tauri-drag-region
      >
        <h1 className="text-base font-semibold text-gray-800">SimpleSHOT 設定</h1>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {/* 権限 */}
        <Section title="権限">
          {/* スクリーン録画 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">スクリーン録画</p>
              <p className="text-xs text-gray-500 mt-0.5">キャプチャに必要な権限です</p>
            </div>
            {hasPermission === null ? (
              <span className="text-xs text-gray-400">確認中...</span>
            ) : hasPermission ? (
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                許可済み ✓
              </span>
            ) : (
              <button
                onClick={() => openSystemPreferences()}
                className="text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg transition-colors"
              >
                権限を付与...
              </button>
            )}
          </div>
          {/* アクセシビリティ（グローバルホットキー用） */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-700">アクセシビリティ</p>
              <p className="text-xs text-gray-500 mt-0.5">グローバルホットキーに必要な権限です</p>
            </div>
            {hasAccessibility === null ? (
              <span className="text-xs text-gray-400">確認中...</span>
            ) : hasAccessibility ? (
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                許可済み ✓
              </span>
            ) : (
              <button
                onClick={() => openAccessibilityPreferences()}
                className="text-xs font-medium text-white bg-orange-500 hover:bg-orange-400 px-3 py-1.5 rounded-lg transition-colors"
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
          <p className="text-xs text-gray-400 mt-2">
            例: CmdOrCtrl+Shift+Space, Alt+1 など
          </p>
        </Section>

        {/* 保存設定 */}
        <Section title="保存設定">
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-700">デフォルト保存先</label>
              <input
                className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-400 bg-white"
                value={settings.save_directory}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, save_directory: e.target.value }))
                }
                placeholder="~/Desktop"
              />
            </div>
            <div>
              <label className="text-sm text-gray-700">画像形式</label>
              <select
                className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-400 bg-white"
                value={settings.image_format}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, image_format: e.target.value as "png" | "jpeg" }))
                }
              >
                <option value="png">PNG</option>
                <option value="jpeg">JPEG</option>
              </select>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-gray-100">
              <div>
                <p className="text-sm text-gray-700">カーソルを含める</p>
                <p className="text-xs text-gray-500 mt-0.5">スクリーンショットにマウスカーソルを表示します</p>
              </div>
              <button
                onClick={() => setSettings((s) => ({ ...s, show_cursor: !s.show_cursor }))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  settings.show_cursor ? "bg-blue-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    settings.show_cursor ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </div>
        </Section>
      </div>

      {/* フッター */}
      <div className="px-6 py-4 border-t border-gray-200 bg-white flex items-center justify-end gap-3">
        <button
          onClick={handleClose}
          className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
        >
          キャンセル
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-lg text-sm text-white bg-blue-600 hover:bg-blue-500 transition-colors"
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
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
        {title}
      </h2>
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 space-y-3">
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
      <span className="text-sm text-gray-700">{label}</span>
      <input
        className="px-2 py-1 rounded border border-gray-200 text-sm font-mono text-gray-800 w-52 focus:outline-none focus:border-blue-400"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
