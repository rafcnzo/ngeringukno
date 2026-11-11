const fs = require('fs');

// logger requires platform, which uses this file: load it lazily to avoid the cycle
function logError(message, e) {
  try { require('./logger').log('error', `${message}: ${e && e.message ? e.message : e}`); } catch (_) {}
}

// Write to a temp file and rename over the target, so a crash mid-write never leaves a truncated file.
function writeJsonAtomic(file, data, pretty = false) {
  const tmp = `${file}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(data, null, pretty ? 2 : 0), 'utf8');
    fs.renameSync(tmp, file);
    return true;
  } catch (e) {
    try { fs.unlinkSync(tmp); } catch (_) {}
    logError(`write failed ${file}`, e);
    return false;
  }
}

// Missing file -> fallback. Unreadable file -> moved aside to <file>.corrupt-<ts> so the next write
// cannot overwrite the only copy of the user's data, then fallback.
function readJsonSafe(file, fallback) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (e) {
    if (e.code !== 'ENOENT') logError(`read failed ${file}`, e);
    return fallback;
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    const aside = `${file}.corrupt-${Date.now()}`;
    try { fs.renameSync(file, aside); } catch (_) {}
    logError(`corrupt JSON moved to ${aside}`, e);
    return fallback;
  }
}

module.exports = { writeJsonAtomic, readJsonSafe };
