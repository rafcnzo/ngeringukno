// Notch mode: while the main window is minimized or hidden to tray, a small island at the top
// center of the screen shows what is playing and expands on hover into a mini player.
const { BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

// The window is sized for the expanded card; everything outside the island is transparent and click-through.
const WIDTH = 440;
const HEIGHT = 190;
const COMMANDS = new Set(['toggle', 'next', 'prev']);
// Hover zones in window coordinates (the island is centered at the top). Closed covers the widest pill.
const CLOSED_ZONE = { w: 372, h: 44 };
const OPEN_ZONE = { w: 420, h: 168 };
const POLL_MS = 30;
// Making the window clickable restyles it on Windows and drops frames, so wait until the expand animation (380 ms) is done.
const CLICKABLE_AFTER_MS = 400;

function createNotch(getMainWindow) {
  let win = null;
  let enabled = true;
  let lastState = null;
  let lastLyrics = [];
  let hoverTimer = null;
  let clickTimer = null;
  let over = false;

  function ensureWindow() {
    if (win && !win.isDestroyed()) return win;
    win = new BrowserWindow({
      width: WIDTH,
      height: HEIGHT,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      focusable: false,
      hasShadow: false,
      alwaysOnTop: true,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'notch-preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });
    win.setAlwaysOnTop(true, 'screen-saver');
    win.setIgnoreMouseEvents(true);
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.webContents.on('will-navigate', (e) => e.preventDefault());
    win.webContents.on('did-finish-load', () => {
      if (lastState) win.webContents.send('notch-state', lastState);
      win.webContents.send('notch-lyrics', lastLyrics);
    });
    win.on('closed', () => { win = null; });
    win.loadFile(path.join(__dirname, '../renderer/notch.html'));
    return win;
  }

  function placeOnDisplay() {
    const main = getMainWindow();
    const display = main && !main.isDestroyed()
      ? screen.getDisplayMatching(main.getNormalBounds())
      : screen.getPrimaryDisplay();
    const { x, y, width } = display.bounds;
    win.setBounds({ x: Math.round(x + (width - WIDTH) / 2), y, width: WIDTH, height: HEIGHT });
  }

  function show() {
    if (!enabled || !lastState || !lastState.title) return;
    ensureWindow();
    placeOnDisplay();
    over = false;
    win.setIgnoreMouseEvents(true);
    if (!win.webContents.isLoading()) win.webContents.send('notch-hover', false);
    win.showInactive();
    // Forwarded mouse events reach a click-through window late on Windows, so the cursor is polled here instead.
    clearInterval(hoverTimer);
    hoverTimer = setInterval(pollCursor, POLL_MS);
  }

  function pollCursor() {
    if (!win || win.isDestroyed() || !win.isVisible()) return;
    const p = screen.getCursorScreenPoint();
    const b = win.getBounds();
    const zone = over ? OPEN_ZONE : CLOSED_ZONE;
    const x = p.x - b.x - (b.width - zone.w) / 2;
    const y = p.y - b.y;
    const inside = x >= 0 && x <= zone.w && y >= 0 && y <= zone.h;
    if (inside === over) return;
    over = inside;
    win.webContents.send('notch-hover', inside);
    clearTimeout(clickTimer);
    if (!inside) win.setIgnoreMouseEvents(true);
    else clickTimer = setTimeout(() => { if (over && win && !win.isDestroyed()) win.setIgnoreMouseEvents(false); }, CLICKABLE_AFTER_MS);
  }

  function hide() {
    clearInterval(hoverTimer);
    clearTimeout(clickTimer);
    hoverTimer = null;
    if (win && !win.isDestroyed() && win.isVisible()) win.hide();
  }

  function destroy() {
    clearInterval(hoverTimer);
    clearTimeout(clickTimer);
    hoverTimer = null;
    if (win && !win.isDestroyed()) win.destroy();
    win = null;
  }

  const fromMain = (e) => {
    const main = getMainWindow();
    return main && !main.isDestroyed() && e.sender === main.webContents;
  };
  const fromNotch = (e) => win && !win.isDestroyed() && e.sender === win.webContents;

  ipcMain.removeAllListeners('notch-state');
  ipcMain.on('notch-state', (e, state) => {
    if (!fromMain(e) || !state || typeof state !== 'object') return;
    lastState = state;
    // load the page while the app is still open, so minimizing shows the notch at once
    if (enabled && state.title) ensureWindow();
    if (win && !win.isDestroyed()) win.webContents.send('notch-state', state);
    if (!state.title) hide();
  });

  ipcMain.removeAllListeners('notch-lyrics');
  ipcMain.on('notch-lyrics', (e, lines) => {
    if (!fromMain(e) || !Array.isArray(lines)) return;
    lastLyrics = lines.slice(0, 2000);
    if (win && !win.isDestroyed()) win.webContents.send('notch-lyrics', lastLyrics);
  });

  ipcMain.removeAllListeners('notch-enabled');
  ipcMain.on('notch-enabled', (e, value) => {
    if (!fromMain(e)) return;
    enabled = !!value;
    if (!enabled) hide();
  });

  ipcMain.removeAllListeners('notch-command');
  ipcMain.on('notch-command', (e, cmd) => {
    if (!fromNotch(e)) return;
    const main = getMainWindow();
    if (!main || main.isDestroyed()) return;
    if (cmd === 'open') {
      if (main.isMinimized()) main.restore();
      main.show();
      main.focus();
    } else if (COMMANDS.has(cmd)) {
      main.webContents.send('media-command', cmd);
    }
  });

  return { show, hide, destroy };
}

module.exports = { createNotch };
