#!/usr/bin/env bash
# 署名 identity を選び、tauri.conf.json の signingIdentity / hardenedRuntime を合わせる。
# 優先: Apple Development（Team ID あり → Sequoia+ の画面収録に必要）
# フォールバック: Pashatt Dev（自己署名・Team ID なし → Hardened Runtime を切る）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONF="$ROOT/src-tauri/tauri.conf.json"

APPLE_DEV="$(
  security find-identity -v -p codesigning 2>/dev/null \
    | sed -n 's/.*"\(Apple Development:.*\)"/\1/p' \
    | head -1
)"

if [[ -n "$APPLE_DEV" ]]; then
  IDENTITY="$APPLE_DEV"
  HARDENED=true
  echo "→ 署名: $IDENTITY (Hardened Runtime ON / Team ID あり)"
else
  IDENTITY="Pashatt Dev"
  HARDENED=false
  echo "→ 署名: $IDENTITY (Hardened Runtime OFF — Team ID 無しのため)"
  echo "  推奨: Xcode → Settings → Accounts で無料 Apple ID を追加すると"
  echo "  「Apple Development」証明書が作られ、画面収録が安定します。"
fi

python3 - "$CONF" "$IDENTITY" "$HARDENED" <<'PY'
import json, sys
path, identity, hardened = sys.argv[1], sys.argv[2], sys.argv[3] == "true"
with open(path, encoding="utf-8") as f:
    data = json.load(f)
mac = data.setdefault("bundle", {}).setdefault("macOS", {})
mac["signingIdentity"] = identity
mac["hardenedRuntime"] = hardened
with open(path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
    f.write("\n")
print(f"✓ tauri.conf.json → signingIdentity={identity!r}, hardenedRuntime={hardened}")
PY
