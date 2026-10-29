#!/usr/bin/env bash
# One-time setup of the key that signs web updates. Run it on your own computer (never in CI):
#   scripts/ota-key.sh
# It writes ota-private.pem (ignored by git), prints the PUBLIC key to paste into src/lib/ota-key.js, and
# the private key to store as the GitHub secret OTA_SIGNING_KEY. Keep a copy of the private key somewhere safe:
# if it is lost, phones can only be updated by installing a new APK.
set -euo pipefail
out="${1:-ota-private.pem}"
[ -e "$out" ] && { echo "$out already exists; remove it first." >&2; exit 1; }
umask 077
openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -out "$out"
echo
echo "1) Public key — set this as OTA_PUBLIC_KEY in src/lib/ota-key.js:"
openssl pkey -in "$out" -pubout -outform DER | base64 -w0
echo
echo
echo "2) Private key — GitHub → Settings → Secrets and variables → Actions → New secret:"
echo "   name: OTA_SIGNING_KEY    value: the full contents of $out (including the BEGIN/END lines)"
echo
echo "3) Then delete or store $out offline; it must never be committed."
