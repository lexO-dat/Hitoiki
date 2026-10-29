// Public key (ECDSA P-256, SPKI, base64) that web-bundle updates must be signed with.
// Empty = no key configured yet: updates are then accepted as before (see scripts/ota-key.sh to set one up).
// Only the PUBLIC half lives here; the private half is the GitHub secret OTA_SIGNING_KEY.
export const OTA_PUBLIC_KEY = '';
