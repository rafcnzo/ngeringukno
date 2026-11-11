// The notch page gets only these calls: no server token, no file or settings access.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('notch', {
  onState: (cb) => ipcRenderer.on('notch-state', (e, state) => cb(state)),
  onLyrics: (cb) => ipcRenderer.on('notch-lyrics', (e, lines) => cb(lines)),
  command: (cmd) => ipcRenderer.send('notch-command', String(cmd)),
  onHover: (cb) => ipcRenderer.on('notch-hover', (e, over) => cb(!!over))
});
