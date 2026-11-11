'use strict';

const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

const { startServer, stopServer, getServerToken } = require('../src/server/server');

function get(port, path, headers = {}) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path, headers }, (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode));
    }).on('error', reject);
  });
}

test('SSRF guard and token checks on local server routes', async () => {
  const port = await startServer(0);
  const token = { 'x-ngeringukno-token': getServerToken() };
  try {
    for (const target of ['http://192.168.1.1/', 'http://0x7f000001/', 'http://169.254.169.254/', 'http://127.0.0.2/']) {
      assert.strictEqual(await get(port, '/api/audio-proxy?url=' + encodeURIComponent(target)), 403, target);
      assert.strictEqual(await get(port, '/api/image-proxy?url=' + encodeURIComponent(target), token), 403, target);
    }
    for (const route of ['/api/image-proxy?url=https://example.com/a.jpg', '/api/playlist-import?url=x', '/api/apple-import?url=x', '/api/lastfm/token']) {
      assert.strictEqual(await get(port, route), 403, route);
    }
  } finally {
    await stopServer();
  }
});

test('updater reads sha256 only from a well-formed GitHub digest', () => {
  const { assetSha256 } = require('../src/main/updater');
  const hex = 'a'.repeat(64);
  assert.strictEqual(assetSha256({ digest: 'sha256:' + hex.toUpperCase() }), hex);
  assert.strictEqual(assetSha256({ digest: 'sha1:' + hex }), null);
  assert.strictEqual(assetSha256({}), null);
  assert.strictEqual(assetSha256(null), null);
});
