#!/usr/bin/env bash
# OTA 署名用の秘密鍵を環境変数に載せてからコマンドを実行する。
# 秘密鍵: ~/.tauri/pashatt.key
# パスワード（任意）: ~/.tauri/pashatt.key.password
#
# 注意: TAURI_SIGNING_PRIVATE_KEY と TAURI_SIGNING_PRIVATE_KEY_PATH は同時にセットしない
# （tauri signer が衝突する）。
set -euo pipefail

KEY_PATH="${TAURI_SIGNING_PRIVATE_KEY_PATH:-$HOME/.tauri/pashatt.key}"
PASS_FILE="${TAURI_SIGNING_PRIVATE_KEY_PASSWORD_FILE:-$HOME/.tauri/pashatt.key.password}"

if [[ -f "$KEY_PATH" ]]; then
  unset TAURI_SIGNING_PRIVATE_KEY_PATH
  export TAURI_SIGNING_PRIVATE_KEY
  TAURI_SIGNING_PRIVATE_KEY="$(cat "$KEY_PATH")"
  export TAURI_SIGNING_PRIVATE_KEY

  if [[ -z "${TAURI_SIGNING_PRIVATE_KEY_PASSWORD:-}" && -f "$PASS_FILE" ]]; then
    export TAURI_SIGNING_PRIVATE_KEY_PASSWORD
    TAURI_SIGNING_PRIVATE_KEY_PASSWORD="$(cat "$PASS_FILE")"
    export TAURI_SIGNING_PRIVATE_KEY_PASSWORD
  fi
  echo "→ Updater signing key loaded from $KEY_PATH"
else
  echo "⚠ Updater private key not found at $KEY_PATH"
  echo "  Continuing without updater signatures…"
fi

exec "$@"
