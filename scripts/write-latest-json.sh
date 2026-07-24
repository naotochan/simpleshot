#!/usr/bin/env bash
# ビルド成果物から GitHub Release 用 latest.json を生成する。
# 使い方（ビルド後）:
#   bash scripts/write-latest-json.sh
#   # → src-tauri/target/release/bundle/macos/latest.json
#
# Release にアップロードする成果物:
#   - Pashatt.app.tar.gz
#   - Pashatt.app.tar.gz.sig
#   - latest.json
#   - （任意）Pashatt_x.y.z_aarch64.dmg
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONF="$ROOT/src-tauri/tauri.conf.json"
MACOS_DIR="${CARGO_TARGET_DIR:-$ROOT/src-tauri/target}/release/bundle/macos"
VERSION="$(python3 -c "import json; print(json.load(open('$CONF'))['version'])")"
REPO="${PASHATT_GITHUB_REPO:-naotochan/pashatt}"
TAG="v${VERSION}"

TAR="$MACOS_DIR/Pashatt.app.tar.gz"
SIG="$MACOS_DIR/Pashatt.app.tar.gz.sig"
OUT="$MACOS_DIR/latest.json"

if [[ ! -f "$TAR" ]]; then
  echo "missing: $TAR" >&2
  echo "Build with updater signing first (npm run tauri:build)." >&2
  exit 1
fi
if [[ ! -f "$SIG" ]]; then
  echo "missing: $SIG" >&2
  echo "Set TAURI_SIGNING_PRIVATE_KEY_PATH=~/.tauri/pashatt.key and rebuild." >&2
  exit 1
fi

SIGNATURE="$(tr -d '\n' < "$SIG")"
URL="https://github.com/${REPO}/releases/download/${TAG}/Pashatt.app.tar.gz"
NOTES="${UPDATE_NOTES:-Pashatt ${VERSION}}"
PUB_DATE="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

python3 - "$OUT" "$VERSION" "$NOTES" "$PUB_DATE" "$URL" "$SIGNATURE" <<'PY'
import json, sys
out, version, notes, pub_date, url, signature = sys.argv[1:7]
payload = {
    "version": version,
    "notes": notes,
    "pub_date": pub_date,
    "platforms": {
        "darwin-aarch64": {
            "signature": signature,
            "url": url,
        },
        # Apple Silicon ビルドを Intel でも案内したい場合は別成果物が必要。
        # 現状は aarch64 のみ。
        "darwin-x86_64": {
            "signature": signature,
            "url": url,
        },
    },
}
with open(out, "w", encoding="utf-8") as f:
    json.dump(payload, f, indent=2, ensure_ascii=False)
    f.write("\n")
print(f"✓ wrote {out}")
print(f"  version={version}")
print(f"  url={url}")
PY
