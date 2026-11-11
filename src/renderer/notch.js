(() => {
  const $ = (id) => document.getElementById(id);
  const island = $('island');
  const api = window.notch;
  let state = null;
  let lyrics = [];
  let lyricIdx = -2;
  let closeTimer = null;
  let lyricsOn = false;
  try { lyricsOn = localStorage.getItem('notch_lyrics') === '1'; } catch (_) {}

  const fmt = (sec) => {
    const s = Math.max(0, Math.floor(sec || 0));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
  // position arrives with the time it was sampled; extrapolate locally instead of streaming updates
  const positionNow = () => {
    if (!state) return 0;
    const live = state.isPlaying ? (Date.now() - (state.at || Date.now())) / 1000 : 0;
    return Math.min(state.duration || Infinity, (state.position || 0) + live);
  };
  const cssUrl = (u) => (u ? `url("${String(u).replace(/["\\\n]/g, '')}")` : 'none');
  const showLyrics = () => lyricsOn && lyrics.length > 0;

  // last line whose start time has passed (binary search; lines are sorted by start)
  function lineAt(pos) {
    let lo = 0, hi = lyrics.length - 1, found = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (lyrics[mid].t <= pos) { found = mid; lo = mid + 1; } else hi = mid - 1;
    }
    return found;
  }
  const lineText = (i) => (i >= 0 && i < lyrics.length ? (lyrics[i].text || '♪') : '');

  function renderLyric(pos) {
    const idx = lineAt(pos);
    if (idx === lyricIdx) return;
    lyricIdx = idx;
    const cur = idx < 0 ? '♪' : lineText(idx);
    $('lyPrev').textContent = lineText(idx - 1);
    $('lyCur').textContent = cur;
    $('lyNext').textContent = lineText(idx + 1);
    $('miniTitle').textContent = cur;
    $('lyCur').animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'ease-out' });
  }

  function renderTime() {
    if (!state) return;
    const pos = positionNow();
    $('elapsed').textContent = fmt(pos);
    $('total').textContent = fmt(state.duration);
    $('progress').style.transform = `scaleX(${state.duration > 0 ? Math.min(1, pos / state.duration) : 0})`;
    if (showLyrics()) renderLyric(pos);
  }

  // rAF stops by itself while the notch window is hidden, so this costs nothing then
  function frame() {
    renderTime();
    requestAnimationFrame(frame);
  }

  function renderMode() {
    document.body.classList.toggle('has-lyrics', lyrics.length > 0);
    document.body.classList.toggle('lyrics-on', lyricsOn);
    $('lyricsBtn').setAttribute('aria-pressed', String(lyricsOn));
    lyricIdx = -2;
    if (state) $('miniTitle').textContent = state.title || '';
    renderTime();
  }

  function render() {
    if (!state) return;
    document.body.classList.toggle('playing', !!state.isPlaying);
    document.documentElement.style.setProperty('--accent', state.color || 'rgb(140, 120, 255)');
    $('title').textContent = state.title || '';
    $('artist').textContent = state.artist || '';
    $('miniCover').style.backgroundImage = cssUrl(state.cover);
    $('art').style.backgroundImage = cssUrl(state.cover);
    renderMode();
  }

  function setOpen(open) {
    clearTimeout(closeTimer);
    island.classList.toggle('open', open);
  }

  // main polls the cursor and tells us when it enters or leaves the island
  api.onHover((over) => {
    if (over) setOpen(true);
    else closeTimer = setTimeout(() => setOpen(false), 40);
  });

  $('mini').addEventListener('click', () => setOpen(true));
  $('art').addEventListener('click', () => api.command('open'));
  $('lyricsBtn').addEventListener('click', () => {
    lyricsOn = !lyricsOn;
    try { localStorage.setItem('notch_lyrics', lyricsOn ? '1' : '0'); } catch (_) {}
    renderMode();
  });
  document.querySelectorAll('[data-cmd]').forEach((btn) => {
    btn.addEventListener('click', () => {
      api.command(btn.dataset.cmd);
      if (btn.dataset.cmd === 'toggle' && state) {
        // flip immediately; the real state follows from the player
        state = { ...state, isPlaying: !state.isPlaying, position: positionNow(), at: Date.now() };
        render();
      }
    });
  });

  api.onState((next) => { state = next; render(); });
  api.onLyrics((lines) => {
    lyrics = Array.isArray(lines) ? lines.filter((l) => l && Number.isFinite(l.t)).sort((a, b) => a.t - b.t) : [];
    renderMode();
  });
  requestAnimationFrame(frame);
})();
