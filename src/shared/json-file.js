const fs = require('fs');

// logger requires platform, which uses this file: load it lazily to avoid the cycle
function logError(message, e) {
  try { require('./logger').log('error', `${message}: ${e && e.message ? e.message : e}`); } catch (_) {}
}

// Write to a temp file and rename over the target, so a crash mid-write never leaves a truncated file.
// With { backup: true } the previous good version is kept as <file>.bak for readJsonSafe to fall back on.
function writeJsonAtomic(file, data, pretty = false, { backup = false } = {}) {
  const tmp = `${file}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(data, null, pretty ? 2 : 0), 'utf8');
    if (backup) {
      try { fs.copyFileSync(file, `${file}.bak`); } catch (e) { if (e.code !== 'ENOENT') logError(`backup failed ${file}`, e); }
    }
    fs.renameSync(tmp, file);
    return true;
  } catch (e) {
    try { fs.unlinkSync(tmp); } catch (_) {}
    logError(`write failed ${file}`, e);
    return false;
  }
}

function parseFile(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// Missing file -> <file>.bak if one exists, else fallback. Unreadable file -> moved aside to
// <file>.corrupt-<ts> (so the next write cannot overwrite the only copy), then <file>.bak, else fallback.
function readJsonSafe(file, fallback) {
  try {
    return parseFile(file);
  } catch (e) {
    if (e instanceof SyntaxError) {
      const aside = `${file}.corrupt-${Date.now()}`;
      try { fs.renameSync(file, aside); } catch (_) {}
      logError(`corrupt JSON moved to ${aside}`, e);
    } else if (e.code !== 'ENOENT') {
      logError(`read failed ${file}`, e);
    }
  }
  try {
    const restored = parseFile(`${file}.bak`);
    logError(`restored ${file} from backup`, 'previous version');
    return restored;
  } catch (_) {
    return fallback;
  }
}

module.exports = { writeJsonAtomic, readJsonSafe };
