# YouTube Content Transcription System (v1.0)

Sistem otomatis untuk mengekstrak narasi atau percakapan dari video YouTube dan mengubahnya menjadi transkrip teks yang terstruktur, bersih, serta dilengkapi **deteksi & verifikasi konten keagamaan** (Al-Qur'an, Hadis, Doa, Dzikir, dan Lafaz Arab).

---

## 🌟 Fitur Utama

1. **URL Validation & Normalization**
   - Mendukung format standar (`youtube.com/watch?v=...`), short link (`youtu.be/...`), embed (`youtube.com/embed/...`), dan YouTube Shorts.
   - Ekstraksi Video ID yang andal.

2. **Dual-Tier Transcription Engine**
   - **Tingkat 1**: Mengambil subtitle/caption resmi YouTube (jika tersedia).
   - **Tingkat 2 (Fallback)**: Unduh audio menggunakan `ytdl-core` / `fluent-ffmpeg` lalu transkripsi dengan Whisper STT (`openai`).

3. **Transcript Cleaning & Merging**
   - Pembersihan artefak caption (`[Musik]`, `[Applause]`, dll.), decoding HTML entities (`&amp;` → `&`), pembersihan karakter kontrol, normalisasi whitespace, dan eliminasi kata berulang akibat stuttering STT.
   - Penggabungan segment pendek untuk meningkatkan keterbacaan.

4. **Deteksi & Verifikasi Konten Keagamaan**
   - **Al-Qur'an**: Mendeteksi sitasi surat dan ayat, lalu memverifikasi lafaz Arab asli dan terjemahan resmi melalui API terpercaya (`alquran.cloud`).
   - **Hadis**: Mengidentifikasi nama perawi utama (Bukhari, Muslim, Tirmidzi, Abu Dawud, dll.) dan nomor hadis tanpa mengubah lafaz ucapan.
   - **Doa & Dzikir**: Menandai bagian doa/dzikir dan mempertahankan transkrip aslinya.
   - **Prinsip Utama**: STT tidak pernah dijadikan patokan kebenaran teks keagamaan. Sistem tidak pernah mengarang lafaz ayat atau riwayat hadis.

5. **Dukungan Batch & Anti-Duplikasi**
   - Input satu URL, banyak URL sekaligus, file teks (`urls.txt`), atau file CSV (`videos.csv`).
   - Tracking video yang sudah diproses via `processed_videos.json`.
   - Mekanisme retry otomatis pada kegagalan jaringan atau API.

6. **Format Output Multi-Channel**
   - **TXT**: Format rapi siap baca manusia lengkap dengan timestamp, penanda ayat, teks Arab terverifikasi, dan terjemahannya.
   - **JSON**: Struktur data lengkap siap diintegrasikan dengan sistem downstream atau database.
   - **CSV**: Ringkasan status pemrosesan per video (`results.csv`).

---

## 📁 Struktur Direktori

```
transkrip-youtube/
├── src/
│   ├── index.js                     # CLI Entry point
│   ├── youtube/
│   │   ├── validator.js             # Validasi & normalisasi URL YouTube
│   │   ├── metadata.js              # Pengambilan judul, channel, durasi
│   │   └── transcript.js            # Pengambilan subtitle/caption YouTube
│   ├── transcription/
│   │   ├── audio.js                 # Download audio & konversi ffmpeg
│   │   ├── speechToText.js          # Integrasi Whisper STT (OpenAI)
│   │   ├── languageDetection.js     # Deteksi bahasa (id, ar, en)
│   │   └── cleaner.js               # Pembersih teks & merge segment
│   ├── religious/
│   │   ├── detector.js              # Deteksi ayat, hadis, lafaz Arab, doa
│   │   ├── quran.js                 # Verifikasi ayat Al-Qur'an via alquran.cloud
│   │   ├── hadith.js                # Resolver kitab & perawi hadis
│   │   └── verifier.js              # Orchestrator verifikasi agama
│   ├── processing/
│   │   ├── processor.js             # Pipeline orchestrator
│   │   ├── queue.js                 # Queue concurrency manager
│   │   ├── retry.js                 # Exponential backoff retry handler
│   │   └── duplicate.js             # Tracking & filter video duplikat
│   ├── output/
│   │   ├── txt.js                   # Generator .txt (human readable)
│   │   ├── json.js                  # Generator .json (machine readable)
│   │   └── csv.js                   # Generator summary .csv
│   └── utils/
│       └── logger.js                # Logging dengan level & timestamp
├── test/
│   └── test-modules.js              # Suite tes mandiri (35 assertions)
├── result/                          # Folder output default
│   ├── transcripts/                 # File .txt
│   ├── json/                        # File .json
│   ├── processed_videos.json        # Database tracking
│   └── results.csv                  # Tabel ringkasan
├── .env.example
├── package.json
└── README.md
```

---

## 🚀 Panduan Penggunaan

### 1. Instalasi

Pastikan telah menginstal [Node.js](https://nodejs.org/) (versi 18+ disarankan) dan [ffmpeg](https://ffmpeg.org/) (jika menggunakan fitur audio fallback).

```bash
cd d:\transkrip-konten\transkrip-youtube
npm install
```

### 2. Konfigurasi Lingkungan (`.env`)

Salin file `.env.example` ke `.env`:

```bash
copy .env.example .env
```

Isi variabel lingkungan sesuai kebutuhan:

```ini
OPENAI_API_KEY=your_openai_api_key_here
MAX_RETRIES=3
OUTPUT_DIR=result
LOG_LEVEL=info
```

> **Catatan**: Jika video memiliki subtitle resmi di YouTube, sistem dapat memprosesnya secara langsung tanpa memerlukan API key OpenAI. API key OpenAI hanya digunakan saat fallback ke Whisper STT diperlukan.

---

### 3. Menjalankan CLI

#### A. Memproses Satu Video
```bash
node src/index.js https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

#### B. Memproses Beberapa Video
```bash
node src/index.js https://youtu.be/video1 https://youtu.be/video2
```

#### C. Memproses dari File Teks (`urls.txt`)
Buat file `urls.txt` dengan satu URL per baris, lalu jalankan:
```bash
node src/index.js --file urls.txt
```

#### D. Memproses dari File CSV (`videos.csv`)
Jika file CSV memiliki kolom header `url` atau link YouTube pada kolom pertama:
```bash
node src/index.js --file input.csv --output hasil_transkrip
```

---

### 4. Menjalankan Pengujian (Unit Tests)

Sistem dilengkapi suite tes mandiri yang memverifikasi seluruh komponen secara menyeluruh:

```bash
npm test
```

Tes mencakup:
- Validasi URL & Video ID extractor
- Pembersihan teks & normalisasi filler/artefak
- Deteksi bahasa & skrip Arab
- Deteksi pola Al-Qur'an, Hadis, dan Doa
- Verifikasi ayat Al-Qur'an secara real-time via API
- Resolver kitab & perawi hadis
- Pengendali duplikasi & batch dedup
- Format output TXT & JSON
