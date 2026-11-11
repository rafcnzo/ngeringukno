# Ngeringukno

> *Ngeringukno* (bahasa Jawa Suroboyoan): "dengarkan".

Pemutar musik desktop untuk YouTube Music, YouTube, SoundCloud, dan file lokal di komputer. Tanpa iklan, tanpa akun, dan tanpa pelacakan. Semua data tersimpan di komputer kamu sendiri.

[Unduh rilis terbaru](https://github.com/rafcnzo/ngeringukno/releases) · [Laporkan bug](https://github.com/rafcnzo/ngeringukno/issues) · [Lisensi MIT](LICENSE)

---

## Isi

- [Fitur](#fitur)
- [Notch player](#notch-player)
- [Instalasi](#instalasi)
- [Menjalankan dari kode sumber](#menjalankan-dari-kode-sumber)
- [Di mana data disimpan](#di-mana-data-disimpan)
- [Keamanan dan privasi](#keamanan-dan-privasi)
- [Struktur proyek](#struktur-proyek)
- [Kredit](#kredit)

## Fitur

**Putar dari mana saja**
- Streaming dari YouTube Music, YouTube, dan SoundCloud tanpa iklan dan tanpa login.
- Pustaka lokal: FLAC, WAV, MP3, OGG, dan M4A, lengkap dengan tag dan cover bawaan file.
- Unduh lagu ke disk (MP3, FLAC, Opus, WAV) dengan tag dan cover otomatis.

**Pindahkan playlist**
- Tempel link playlist publik dari Spotify, Apple Music, Deezer, YouTube Music, atau SoundCloud, lalu Ngeringukno mencarikan lagunya dan menyimpannya sebagai playlist lokal.

**Lirik**
- Lirik tersinkron dari beberapa sumber, file LRC lokal, atau lirik yang kamu tulis sendiri.
- Geser waktu lirik secara manual, terjemahkan lirik, dan mode layar penuh ala karaoke.

**Olah suara**
- Equalizer 10 band dan 3 band, tempo, pitch, reverb, dan distorsi secara real time.
- Editor audio sederhana untuk memotong dan menyimpan bagian lagu tanpa mengubah file aslinya.

**Tampilan**
- Warna antarmuka mengikuti cover lagu yang sedang diputar.
- Editor tema dan CSS, latar animasi, dan pengaturan transparansi.
- Visualizer berbasis Canvas dan WebGL.

**Lainnya**
- Status lagu di Discord (Rich Presence).
- Plugin untuk menambah atau mengubah fungsi aplikasi.
- Cadangan akun terenkripsi dengan kata sandi.
- Pemutaran berlanjut dengan crossfade antar lagu.

## Notch player

Saat jendela utama di-minimize atau disembunyikan ke tray, sebuah *notch* hitam muncul di tengah atas layar, mirip Dynamic Island.

- **Tertutup:** cover kecil, judul lagu, dan equalizer mini berwarna sesuai cover.
- **Terbuka (arahkan kursor ke notch):** cover besar, progress lagu, dan tombol sebelumnya / putar / berikutnya. Klik cover untuk membuka aplikasi lagi.
- **Mode lirik:** tombol lirik menampilkan baris yang sedang dinyanyikan, langsung di notch.
- Muncul di monitor tempat jendela utama berada. Bisa dimatikan di **Settings → Notch player when minimized**.

Tombol *Notch player* di title bar (atau tombol `P`) langsung mengecilkan aplikasi ke notch.

## Instalasi

Ambil installer dari halaman [Releases](https://github.com/rafcnzo/ngeringukno/releases). yt-dlp dan ffmpeg sudah ikut di dalam paket, jadi tidak perlu dipasang terpisah.

- **Windows 10/11:** jalankan installer. Folder instalasi bisa dipilih. Data kamu tidak ikut terhapus saat uninstall.
- **Linux dan macOS:** bisa dibangun dari kode sumber (lihat di bawah). Build macOS belum ditandatangani Apple, jadi saat pertama dibuka pilih **klik kanan → Open**.

## Menjalankan dari kode sumber

Butuh Node.js 22 atau lebih baru (lihat `.nvmrc`).

```bash
git clone https://github.com/rafcnzo/ngeringukno.git
cd ngeringukno
npm install
npm run dev
```

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Mode pengembangan, aplikasi restart otomatis saat kode berubah. Tekan F12 untuk DevTools. |
| `npm start` | Jalankan aplikasi sekali. |
| `npm test` | Jalankan test (`node --test`). |
| `npm run dist` | Buat installer dengan electron-builder. |

Setiap push dan pull request diuji otomatis oleh GitHub Actions (`.github/workflows/ci.yml`).

## Di mana data disimpan

| Sistem | Pengaturan | Pustaka, cache, dan unduhan |
|---|---|---|
| Windows | `%APPDATA%\Ngeringukno` | `%LOCALAPPDATA%\Ngeringukno` |
| macOS | `~/Library/Application Support/Ngeringukno` | folder yang sama |
| Linux | `~/.config/Ngeringukno` | `~/.cache/devsize` |

Folder pustaka bisa dipindah lewat variabel lingkungan `NGERINGUKNO_DATA_DIR`.

Pustaka disimpan dengan cadangan otomatis (`library.json.bak`). Kalau file utamanya rusak, Ngeringukno memulihkannya dari cadangan.

## Keamanan dan privasi

- Tidak ada telemetri, analitik, atau ID pelacak.
- Server lokal aplikasi hanya mendengarkan `127.0.0.1` dan setiap permintaan wajib membawa token acak.
- Pembaruan aplikasi dicek dengan hash SHA-256 sebelum dipasang.
- Cadangan akun dienkripsi (scrypt + AES-GCM) dengan kata sandi pilihanmu.
- Plugin bisa menjalankan kode apa pun, jadi aplikasi selalu memberi peringatan sebelum plugin dipasang. Pasang hanya plugin dari sumber yang kamu percaya.

## Struktur proyek

```
src/
  main/       proses utama Electron: jendela, notch, server lokal, updater
  renderer/   antarmuka: app.js, index.html, notch.html
  shared/     helper yang dipakai kedua sisi (mis. penulisan JSON yang aman)
test/         test node --test
scripts/      skrip pengembangan (dev.js)
plugin/       contoh dan API plugin
```

## Kredit

Ngeringukno adalah fork dari **[Riff](https://github.com/rootscripts/riff)** karya **rootscripts**, yang dirilis dengan lisensi MIT. Terima kasih untuk fondasi yang luar biasa. Pemberitahuan hak cipta aslinya tetap dipertahankan di [LICENSE](LICENSE).

Dibangun dengan [Electron](https://www.electronjs.org/), [yt-dlp](https://github.com/yt-dlp/yt-dlp), dan [FFmpeg](https://ffmpeg.org/).

## Catatan

Ngeringukno dibuat untuk penggunaan pribadi. Patuhi ketentuan layanan setiap platform dan aturan hak cipta yang berlaku di tempatmu.
