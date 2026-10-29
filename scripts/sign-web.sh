#!/usr/bin/env bash
# Signs the web bundle for in-app updates and adds the signature to the release notes.
# Runs in the release job that only handles finished files (no project code is executed there).
# Needs: OTA_SIGNING_KEY (PEM, from a secret), APP_VERSION, web-$APP_VERSION.zip and release-notes.md.
set -euo pipefail
if [ -z "${OTA_SIGNING_KEY:-}" ]; then
  echo "::warning title=Web update not signed::OTA_SIGNING_KEY is not set. Apps with a configured public key will refuse this web update."
  exit 0
fi
dir=$(mktemp -d)
trap 'rm -rf "$dir"' EXIT
umask 077
printf '%s\n' "$OTA_SIGNING_KEY" > "$dir/key.pem"
sha=$(sha256sum "web-$APP_VERSION.zip" | cut -d' ' -f1)
native=$(grep -oP 'pausa-native: \K[0-9]+' release-notes.md)
printf '%s' "hitoiki-web|$APP_VERSION|$native|$sha" > "$dir/msg"
openssl dgst -sha256 -sign "$dir/key.pem" -out "$dir/sig" "$dir/msg"
# The key must match the one the app trusts, otherwise every phone would refuse this update.
pub=$(openssl pkey -in "$dir/key.pem" -pubout -outform DER | base64 -w0)
if ! grep -q "OTA_PUBLIC_KEY = '$pub'" src/lib/ota-key.js; then
  echo "::error title=Signing key mismatch::OTA_SIGNING_KEY does not match OTA_PUBLIC_KEY in src/lib/ota-key.js."
  exit 1
fi
echo "<!-- web-sig: $(base64 -w0 "$dir/sig") -->" >> release-notes.md
echo "Web bundle signed."
