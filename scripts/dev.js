// `npm run dev`: runs the app and restarts it when main/server/shared code changes.
// Renderer changes only reload the page (handled in main.js when NGERINGUKNO_DEV=1).
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const electron = require('electron');

const root = path.join(__dirname, '..');
const watched = ['src/main', 'src/server', 'src/shared'].map((d) => path.join(root, d));
let child = null;
let restarting = false;
let timer = null;

function start() {
  child = spawn(electron, ['.'], { cwd: root, stdio: 'inherit', env: { ...process.env, NGERINGUKNO_DEV: '1' } });
  child.on('exit', (code) => {
    child = null;
    if (restarting) { restarting = false; start(); return; }
    process.exit(code || 0); // the user closed the app: stop watching too
  });
}

function restart(file) {
  clearTimeout(timer);
  timer = setTimeout(() => {
    console.log(`[dev] ${file} changed, restarting`);
    if (!child) return start();
    restarting = true;
    child.kill();
  }, 300);
}

for (const dir of watched) {
  fs.watch(dir, { recursive: true }, (_, file) => { if (file && file.endsWith('.js')) restart(file); });
}
start();
