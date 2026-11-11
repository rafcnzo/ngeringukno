const { dialog, ipcMain, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('../shared/platform');
const { writeJsonAtomic } = require('../shared/json-file');

const PLUGINS_DIR = path.join(DATA_DIR, 'plugins');
const STATE_PATH = path.join(PLUGINS_DIR, 'plugins.json');
const MAX_BYTES = 1024 * 1024;
const safeName = (n) => /^[\w.\- ]+\.js$/.test(String(n)) && !String(n).includes('..');

const EXAMPLE = '/**\n * @name Hello plugin\n * @author Ngeringukno\n * @version 1.0.0\n * @description Shows a message when the track changes. Edit or delete this file.\n */\nconst off = Ngeringukno.on(\'trackchange\', (track) => Ngeringukno.toast(\'Now playing: \' + track.title));\nreturn { stop() { off(); } };\n';

function ensureDir() {
  if (fs.existsSync(PLUGINS_DIR)) return;
  fs.mkdirSync(PLUGINS_DIR, { recursive: true });
  try { fs.writeFileSync(path.join(PLUGINS_DIR, 'example-hello.js'), EXAMPLE); } catch (e) {}
}

function readState() {
  try {
    const j = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    return j && typeof j.enabled === 'object' && j.enabled ? j.enabled : {};
  } catch (e) { return {}; }
}

function writeState(enabled) {
  ensureDir();
  writeJsonAtomic(STATE_PATH, { enabled });
}

function parseMeta(code, fallbackName) {
  const block = code.match(/\/\*[\s\S]*?\*\//);
  const text = block ? block[0] : '';
  const pick = (key) => {
    const m = text.match(new RegExp('@' + key + '[ \\t]+([^\\r\\n*]+)'));
    return m ? m[1].trim() : '';
  };
  return { name: pick('name') || fallbackName, author: pick('author'), version: pick('version'), description: pick('description') };
}

function listAll() {
  ensureDir();
  const enabled = readState();
  return fs.readdirSync(PLUGINS_DIR).filter((f) => f.toLowerCase().endsWith('.js') && safeName(f)).map((f) => {
    try {
      const full = path.join(PLUGINS_DIR, f);
      if (fs.statSync(full).size > MAX_BYTES) return null;
      const code = fs.readFileSync(full, 'utf8');
      return { file: f, ...parseMeta(code, f.replace(/\.js$/i, '')), enabled: !!enabled[f], code };
    } catch (e) { return null; }
  }).filter(Boolean);
}

function register(getWindow) {
  ipcMain.handle('plugins-list', () => listAll());
  ipcMain.on('plugins-set-enabled', (e, file, on) => {
    if (!safeName(file)) return;
    const s = readState();
    if (on) s[file] = true; else delete s[file];
    writeState(s);
  });
  ipcMain.on('plugins-disable-all', () => writeState({}));
  ipcMain.on('plugins-open-folder', () => { ensureDir(); shell.openPath(PLUGINS_DIR); });
  ipcMain.on('plugins-remove', (e, file) => {
    if (!safeName(file)) return;
    try { fs.unlinkSync(path.join(PLUGINS_DIR, file)); } catch (err) {}
    const s = readState();
    delete s[file];
    writeState(s);
  });
  ipcMain.handle('plugins-import', async () => {
    ensureDir();
    const result = await dialog.showOpenDialog(getWindow(), { title: 'Add plugin', properties: ['openFile', 'multiSelections'], filters: [{ name: 'JavaScript plugin', extensions: ['js'] }] });
    if (result.canceled) return 0;
    // shortcut: plugins are not sandboxed (the API hands out DOM nodes synchronously); warn instead.
    // A real sandbox needs an async, message-based plugin API and would break existing plugins.
    const warn = await dialog.showMessageBox(getWindow(), {
      type: 'warning',
      title: 'Only add plugins you trust',
      message: 'Plugins run with full access to Ngeringukno.',
      detail: 'A plugin can read your settings and saved service keys and act as the app. Only add plugins from people you trust.',
      buttons: ['Cancel', 'Add plugin'],
      defaultId: 0,
      cancelId: 0
    });
    if (warn.response !== 1) return 0;
    let added = 0;
    for (const file of result.filePaths) {
      try {
        const name = path.basename(file);
        if (!safeName(name) || fs.statSync(file).size > MAX_BYTES) continue;
        fs.copyFileSync(file, path.join(PLUGINS_DIR, name));
        added++;
      } catch (e) {}
    }
    return added;
  });
}

module.exports = { register };
