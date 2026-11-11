'use strict';

const test = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
const zlib = require('node:zlib');

const { encryptAccount, decryptAccount, needsPassword } = require('../src/main/account-crypto');

test('v2 account files need the right password', () => {
  const data = { app: 'Ngeringukno', localStorage: { ngeringukno_lastfm_sk: 'secret' } };
  const file = encryptAccount(data, 'correct horse');
  assert.ok(needsPassword(file));
  assert.ok(!file.includes(Buffer.from('secret')));
  assert.deepStrictEqual(decryptAccount(file, 'correct horse'), data);
  assert.throws(() => decryptAccount(file, 'wrong pass'), /Wrong password/);
  assert.throws(() => decryptAccount(file), /Password required/);
  assert.throws(() => encryptAccount(data, 'short'), /at least 8/);
});

test('v1 files exported by upstream Riff still import without a password', () => {
  const key = crypto.createHash('sha256').update('riff-account-key-v1').digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([cipher.update(zlib.deflateRawSync(Buffer.from('{"localStorage":{"riff_volume":"0.5"}}'))), cipher.final()]);
  const file = Buffer.concat([Buffer.from('RFAC'), iv, cipher.getAuthTag(), body]);
  assert.ok(!needsPassword(file));
  assert.deepStrictEqual(decryptAccount(file), { localStorage: { riff_volume: '0.5' } });
});
