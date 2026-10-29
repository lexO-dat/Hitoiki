// Authenticity of web-bundle updates. The release is built by CI, which signs "what is being offered"
// (version, native level, SHA-256 of the zip) with a private key that lives only in a GitHub secret.
// The app embeds the public key and refuses anything that doesn't verify, so someone who gets hold of
// the repository or the release page still cannot push code to the phones. Pure WebCrypto, no plugins.
const b64 = (s) => Uint8Array.from(atob(s.replace(/\s+/g, '')), (c) => c.charCodeAt(0));

// What is signed. The version is part of it, so an old signed bundle can't be passed off as a newer one.
export const signedMessage = ({ version, native, sha256 }) => `hitoiki-web|${version}|${native}|${sha256}`;

// openssl writes ECDSA signatures as DER (SEQUENCE of two INTEGERs); WebCrypto wants r||s, 32 bytes each.
export function derToRaw(der) {
  let i = 0;
  const need = (ok) => {
    if (!ok) throw new Error('bad signature encoding');
  };
  const len = () => {
    let n = der[i++];
    if (n & 0x80) {
      const k = n & 0x7f;
      need(k >= 1 && k <= 2);
      n = 0;
      for (let j = 0; j < k; j++) n = (n << 8) | der[i++];
    }
    return n;
  };
  need(der[i++] === 0x30);
  need(len() === der.length - i);
  const out = new Uint8Array(64);
  for (let part = 0; part < 2; part++) {
    need(der[i++] === 0x02);
    let n = len();
    need(n > 0 && i + n <= der.length);
    while (n > 32 && der[i] === 0) (i++, n--); // leading zero that keeps the integer positive
    need(n <= 32);
    out.set(der.subarray(i, i + n), part * 32 + (32 - n));
    i += n;
  }
  need(i === der.length);
  return out;
}

// True only if `signature` (base64 DER) is a valid signature of the offered update by `publicKey` (base64 SPKI).
export async function verifyUpdate(info, signature, publicKey, subtle = globalThis.crypto?.subtle) {
  try {
    if (!subtle || !signature || !publicKey || !/^[0-9a-f]{64}$/.test(info.sha256 ?? '')) return false;
    const key = await subtle.importKey('spki', b64(publicKey), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    return await subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, derToRaw(b64(signature)), new TextEncoder().encode(signedMessage(info)));
  } catch {
    return false;
  }
}
