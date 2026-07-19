#!/usr/bin/env bash
# SimpleSHOT 開発用の自己署名 Code Signing 証明書を一度だけ作成する。
# 同じ identity で署名すると、画面収録などの TCC 権限が再ビルド後も維持される。
# 費用ゼロ・Apple Developer プログラム不要。
set -euo pipefail

IDENTITY_NAME="SimpleSHOT Dev"
KEYCHAIN="${HOME}/Library/Keychains/login.keychain-db"
if [[ ! -f "$KEYCHAIN" ]]; then
  KEYCHAIN="${HOME}/Library/Keychains/login.keychain"
fi

if security find-identity -v -p codesigning 2>/dev/null | grep -q "\"${IDENTITY_NAME}\""; then
  echo "✓ 証明書は既にあります: ${IDENTITY_NAME}"
  security find-identity -v -p codesigning | grep "\"${IDENTITY_NAME}\"" || true
  exit 0
fi

# 未信頼の同名証明書が残っている場合は信頼だけ付与して終了
if security find-identity -p codesigning 2>/dev/null | grep -q "\"${IDENTITY_NAME}\""; then
  echo "→ 既存証明書に信頼を付与します: ${IDENTITY_NAME}"
  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT
  security find-certificate -c "$IDENTITY_NAME" -p "$KEYCHAIN" > "$TMP/cert.pem"
  security add-trusted-cert -d -r trustRoot -k "$KEYCHAIN" "$TMP/cert.pem"
  if security find-identity -v -p codesigning 2>/dev/null | grep -q "\"${IDENTITY_NAME}\""; then
    echo "✓ 完了: ${IDENTITY_NAME}"
    exit 0
  fi
  echo "✗ 信頼の付与に失敗しました。Keychain Access で「SimpleSHOT Dev」を削除してから再実行してください。"
  exit 1
fi

echo "→ 自己署名 Code Signing 証明書を作成中: ${IDENTITY_NAME}"

TMPDIR_CERT="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_CERT"' EXIT

CONF="${TMPDIR_CERT}/codesign.conf"
cat > "$CONF" <<'EOF'
[req]
distinguished_name = req_distinguished_name
prompt = no
x509_extensions = extensions

[req_distinguished_name]
CN = SimpleSHOT Dev
O = SimpleSHOT Local Dev
C = JP

[extensions]
basicConstraints = critical,CA:false
keyUsage = critical,digitalSignature
extendedKeyUsage = critical,codeSigning
subjectKeyIdentifier = hash
EOF

KEY="${TMPDIR_CERT}/simpleshot-dev.key"
CRT="${TMPDIR_CERT}/simpleshot-dev.crt"
P12="${TMPDIR_CERT}/simpleshot-dev.p12"
PASS="simpleshot-dev-local"

openssl req -new -newkey rsa:2048 -nodes \
  -keyout "$KEY" \
  -out "${TMPDIR_CERT}/simpleshot-dev.csr" \
  -config "$CONF"

openssl x509 -req \
  -in "${TMPDIR_CERT}/simpleshot-dev.csr" \
  -signkey "$KEY" \
  -out "$CRT" \
  -days 3650 \
  -extfile "$CONF" \
  -extensions extensions

# macOS security が読めるようレガシー互換で書き出す（OpenSSL 3 既定だと import が失敗することがある）
openssl pkcs12 -export \
  -out "$P12" \
  -inkey "$KEY" \
  -in "$CRT" \
  -name "$IDENTITY_NAME" \
  -passout "pass:${PASS}" \
  -certpbe PBE-SHA1-3DES \
  -keypbe PBE-SHA1-3DES \
  -macalg SHA1

security import "$P12" \
  -k "$KEYCHAIN" \
  -P "$PASS" \
  -T /usr/bin/codesign \
  -T /usr/bin/security

# codesign がパスフレーズなしで鍵を使えるようにする
security set-key-partition-list \
  -S apple-tool:,apple:,codesign: \
  -s \
  -k "" \
  "$KEYCHAIN" 2>/dev/null || \
  echo "⚠ set-key-partition-list をスキップ（初回 codesign 時に Keychain 許可が出る場合があります）"

# 自己署名を trustRoot にして valid identity にする（これがないと TCC 安定化に使えない）
security add-trusted-cert -d -r trustRoot -k "$KEYCHAIN" "$CRT"

if ! security find-identity -v -p codesigning 2>/dev/null | grep -q "\"${IDENTITY_NAME}\""; then
  echo "✗ 証明書の登録に失敗しました"
  security find-identity -p codesigning 2>&1 || true
  exit 1
fi

echo ""
echo "✓ 完了: ${IDENTITY_NAME}"
echo ""
echo "次の手順:"
echo "  1. npm run tauri:build"
echo "  2. 生成された .app を一度起動し、画面収録を許可（この1回だけ）"
echo "  3. 以降は同じ証明書で署名されるので、再ビルドしても権限は維持されます"
echo ""
echo "古い ad-hoc 版の SimpleSHOT が設定に残っている場合は削除してから許可し直してください。"
