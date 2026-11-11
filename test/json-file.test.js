'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { writeJsonAtomic, readJsonSafe } = require('../src/shared/json-file');

test('corrupt JSON is moved aside, never overwritten by the next save', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ngk-json-'));
  const file = path.join(dir, 'library.json');
  fs.writeFileSync(file, '{"a": {"title": "half writ'); // truncated by a crash

  assert.deepStrictEqual(readJsonSafe(file, {}), {});
  const aside = fs.readdirSync(dir).filter((f) => f.startsWith('library.json.corrupt-'));
  assert.strictEqual(aside.length, 1);
  assert.strictEqual(fs.readFileSync(path.join(dir, aside[0]), 'utf8'), '{"a": {"title": "half writ');

  assert.strictEqual(writeJsonAtomic(file, { b: 1 }), true);
  assert.deepStrictEqual(readJsonSafe(file, {}), { b: 1 });
  assert.deepStrictEqual(fs.readdirSync(dir).filter((f) => f.endsWith('.tmp')), []);
});

test('missing file returns the fallback and a failed write keeps the old file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ngk-json-'));
  const file = path.join(dir, 'state.json');
  assert.deepStrictEqual(readJsonSafe(file, { x: 0 }), { x: 0 });

  writeJsonAtomic(file, { keep: true });
  const circular = {};
  circular.self = circular;
  assert.strictEqual(writeJsonAtomic(file, circular), false);
  assert.deepStrictEqual(readJsonSafe(file, null), { keep: true });
});
