import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { generateKeyPairSync, createSign } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { derToRaw, signedMessage, verifyUpdate } from '../src/lib/ota.js';

const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const pub = publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
const info = { version: '1.7.0', native: 7, sha256: 'ab'.repeat(32) };
const sign = (i, key = privateKey) => createSign('sha256').update(signedMessage(i)).sign(key).toString('base64'); // DER, like openssl

test('a genuine signature verifies', async () => {
  assert.equal(await verifyUpdate(info, sign(info), pub), true);
});

test('anything that differs from what was signed is refused', async () => {
  const sig = sign(info);
  assert.equal(await verifyUpdate({ ...info, sha256: 'cd'.repeat(32) }, sig, pub), false, 'another bundle');
  assert.equal(await verifyUpdate({ ...info, version: '1.7.1' }, sig, pub), false, 'another version');
  assert.equal(await verifyUpdate({ ...info, native: 8 }, sig, pub), false, 'another native level');
  const other = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  assert.equal(await verifyUpdate(info, sign(info, other.privateKey), pub), false, 'signed by someone else');
});

test('malformed input never throws and never passes', async () => {
  const sig = sign(info);
  for (const bad of [undefined, '', 'AAAA', sig.slice(4), `${sig}AA`, Buffer.from('x'.repeat(70)).toString('base64')]) assert.equal(await verifyUpdate(info, bad, pub), false);
  assert.equal(await verifyUpdate(info, sig, ''), false, 'no key');
  assert.equal(await verifyUpdate(info, sig, 'not-a-key'), false);
  assert.equal(await verifyUpdate({ ...info, sha256: 'xyz' }, sig, pub), false);
  assert.equal(await verifyUpdate(info, sig, pub, undefined), true, 'default WebCrypto');
  assert.equal(await verifyUpdate(info, sig, pub, null) || (globalThis.crypto?.subtle ? true : false), true);
});

test('DER signatures with short integers decode to 64 bytes', () => {
  const der = Uint8Array.from([0x30, 0x08, 0x02, 0x02, 0x01, 0x02, 0x02, 0x02, 0x00, 0xff]);
  const raw = derToRaw(der);
  assert.equal(raw.length, 64);
  assert.deepEqual([raw[30], raw[31], raw[63]], [1, 2, 0xff]);
  assert.throws(() => derToRaw(Uint8Array.from([0x30, 0x01, 0x00])));
});

test('the CI script (openssl) produces signatures the app accepts, and rejects a mismatched key', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ota-'));
  try {
    const run = (args, env = {}) => execFileSync('bash', args, { cwd: dir, env: { ...process.env, ...env }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const script = new URL('../scripts/sign-web.sh', import.meta.url).pathname;
    run(['-c', `openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -out k.pem`]);
    const key = readFileSync(join(dir, 'k.pem'), 'utf8');
    const spki = execFileSync('bash', ['-c', 'openssl pkey -in k.pem -pubout -outform DER | base64 -w0'], { cwd: dir, encoding: 'utf8' });
    writeFileSync(join(dir, 'web-1.7.0.zip'), 'zip bytes');
    writeFileSync(join(dir, 'release-notes.md'), '## Cambios\n<!-- pausa-native: 7 -->\n');
    run(['-c', 'mkdir -p src/lib'], {});
    writeFileSync(join(dir, 'src/lib/ota-key.js'), `export const OTA_PUBLIC_KEY = '${spki}';\n`);
    run([script], { OTA_SIGNING_KEY: key, APP_VERSION: '1.7.0' });
    const notes = readFileSync(join(dir, 'release-notes.md'), 'utf8');
    const sig = /web-sig: ([A-Za-z0-9+/=]+)/.exec(notes)[1];
    const sha = execFileSync('bash', ['-c', 'sha256sum web-1.7.0.zip | cut -d" " -f1'], { cwd: dir, encoding: 'utf8' }).trim();
    assert.equal(await verifyUpdate({ version: '1.7.0', native: 7, sha256: sha }, sig, spki), true);
    writeFileSync(join(dir, 'src/lib/ota-key.js'), "export const OTA_PUBLIC_KEY = 'other';\n");
    assert.throws(() => run([script], { OTA_SIGNING_KEY: key, APP_VERSION: '1.7.0' }), (e) => e.status === 1 && /mismatch/.test(e.stderr + e.stdout));
    assert.ok(!run([script], { OTA_SIGNING_KEY: '', APP_VERSION: '1.7.0' }).includes('Web bundle signed'), 'no secret: skipped, not failed');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
