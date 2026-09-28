# YouTube Content Transcription System — PRD

**Version:** 1.0
**Status:** Final
**Product Type:** Content Transcription & Processing System
**Primary Input:** YouTube Video URL
**Primary Output:** Structured Video Transcript

---

## 1. Product Overview

YouTube Content Transcription System adalah sistem yang digunakan untuk mengambil isi percakapan atau narasi dari video YouTube dan mengubahnya menjadi transkrip teks yang terstruktur, bersih, dan dapat diproses oleh sistem lain.

Sistem dirancang untuk mendukung video umum maupun video yang mengandung konten keagamaan, seperti:

- Ayat Al-Qur'an
- Hadis
- Doa
- Dzikir
- Kutipan berbahasa Arab
- Terjemahan ayat atau hadis
- Kajian atau ceramah agama

Sistem harus mengutamakan akurasi dan keterlacakan sumber, terutama untuk teks keagamaan.

**Alur utama:**

```
YouTube URL
     ↓
URL Validation
     ↓
Video Metadata
     ↓
Transcript Detection
     ↓
Transcript / Audio
     ↓
Speech-to-Text
     ↓
Transcript Cleaning
     ↓
Religious Content Detection
     ↓
Quran / Hadith Verification
     ↓
Transcript Assembly
     ↓
Structured Output
```

---

## 2. Product Goals

Sistem harus mampu:

- Menerima satu atau banyak URL YouTube.
- Memvalidasi URL.
- Mengambil metadata video.
- Mengambil transcript/subtitle yang tersedia.
- Menggunakan audio-to-text apabila transcript tidak tersedia.
- Menangani bahasa Indonesia, Inggris, Arab, dan mixed language.
- Mempertahankan timestamp.
- Mendeteksi konten Al-Qur'an dan hadis.
- Memverifikasi teks Al-Qur'an berdasarkan sumber terpercaya.
- Memverifikasi referensi hadis jika memungkinkan.
- Tidak mengarang teks agama atau referensinya.
- Memproses banyak video dalam satu batch.
- Menangani error per video tanpa menghentikan seluruh batch.
- Menghasilkan output TXT, JSON, dan CSV.
- Menyediakan transcript yang dapat digunakan oleh sistem AI berikutnya.

---

## 3. Product Scope

### Included

- YouTube URL processing
- Video metadata extraction
- Transcript retrieval
- Audio extraction
- Speech-to-text
- Language detection
- Transcript cleaning
- Timestamp preservation
- Religious content detection
- Quran reference identification
- Quran text verification
- Hadith identification
- Hadith source verification
- Batch processing
- Duplicate handling
- Retry mechanism
- Error handling
- TXT output
- JSON output
- CSV output
- Processing logs
- Progress tracking

### Not Included (v1)

- Niche classification
- Relevance filtering
- Summarization
- Keyword extraction
- Sentiment analysis
- Content scoring
- Ebook generation
- Automatic chapter generation
- AI rewriting
- Fact checking seluruh isi video
- Opinion generation
- Content recommendation

---

## 4. Input

Input utama adalah URL video YouTube.

**Single URL:**

```
https://www.youtube.com/watch?v=xxxxxxxxxxx
```

**Multiple URLs:**

```
https://www.youtube.com/watch?v=abc123
https://www.youtube.com/watch?v=def456
https://www.youtube.com/watch?v=ghi789
```

**CSV:**

```csv
youtube_url
https://www.youtube.com/watch?v=abc123
https://www.youtube.com/watch?v=def456
https://www.youtube.com/watch?v=ghi789
```

Untuk versi pertama, kolom wajib hanya: `youtube_url`

---

## 5. URL Validation

URL yang didukung:

- `https://www.youtube.com/watch?v=abc123`
- `https://youtu.be/abc123`

Sistem harus dapat mengekstrak: **Video ID**

URL berikut **tidak diproses**:

- `https://www.youtube.com/channel/xxxxx`
- `https://www.youtube.com/@username`
- `https://www.youtube.com/playlist?list=xxxxx`

Jika URL tidak valid:

```json
{
  "status": "failed",
  "error": "Invalid YouTube video URL"
}
```

---

## 6. Video Metadata

Minimal:

- Video ID
- Video URL
- Title
- Channel name
- Duration
- Published date (jika tersedia)

Contoh:

```json
{
  "video_id": "abc123",
  "title": "Judul Video",
  "channel": "Example Channel",
  "duration": 1245
}
```

---

## 7. Transcript Source

**Priority 1: Existing Transcript**
Jika transcript/subtitle tersedia dan dapat diakses, gunakan langsung.

**Priority 2: Audio Transcription**
Jika transcript tidak tersedia, ekstrak audio → Speech-to-Text.

---

## 8. Speech-to-Text

Harus mampu menangani:

- Bahasa Indonesia, Inggris, Arab
- Percakapan, Narasi, Ceramah
- Istilah asing, Nama orang/tempat
- Istilah keagamaan, Pergantian bahasa

Sistem **tidak boleh** mengubah gaya bicara menjadi bahasa formal.

---

## 9. Language Detection

Setiap segment dapat memiliki language identifier.

```json
{ "language": "id", "text": "Allah berfirman..." }
{ "language": "ar", "text": "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا" }
```

---

## 10. Timestamp

Setiap segment transcript sebaiknya memiliki timestamp.

```json
{
  "start": 3.2,
  "end": 7.8,
  "text": "Selamat datang di video kali ini."
}
```

---

## 11. Transcript Cleaning

**Boleh diperbaiki:**

- Spasi berlebihan
- Baris kosong berlebihan
- Karakter aneh
- Artefak transcription
- Duplikasi kata yang jelas merupakan error STT

**Tidak boleh:** Mengubah makna atau melakukan rewriting.

---

## 12. Speaker Diarization (Opsional)

Jika provider mendukung, identifikasi pembicara. Jika tidak, transcript tetap dibuat tanpa speaker identification.

---

## 13. Religious Content Detection

Jenis konten yang dideteksi:

- Al-Qur'an, Hadis, Doa, Dzikir
- Lafaz Arab, Nama surat/ayat
- Nama sahabat/perawi/kitab hadis
- Kutipan ulama
- Terjemahan ayat/hadis

---

## 14. Quran Transcription

Speech-to-text **tidak boleh** menjadi sumber kebenaran utama untuk teks Al-Qur'an.

Alur:

```
Audio → STT → Quran Detection → Surah/Ayah Identification → Verified Quran Source → Verified Arabic Text → Transcript
```

---

## 15. Quran Source Verification

Jika referensi ayat berhasil diidentifikasi, gunakan sumber teks Al-Qur'an yang telah diverifikasi.

---

## 16. Arabic Text Preservation

Pertahankan: huruf Arab, harakat, tanda waqaf, struktur ayat, nomor ayat, nama surat, tanda baca.

---

## 17. Quran Text vs Translation

Bedakan:

- **Arabic Text:** بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
- **Transliteration:** Bismillāhir-raḥmānir-raḥīm
- **Translation:** Dengan nama Allah Yang Maha Pengasih, Maha Penyayang.

---

## 18. Quran Reference Detection

```json
{
  "type": "quran",
  "surah": "Al-Baqarah",
  "surah_number": 2,
  "ayah": 286,
  "verification_status": "verified"
}
```

Jika referensi tidak dapat diidentifikasi: `reference_status: unknown`

---

## 19. Hadith Transcription

Deteksi: teks hadis Arab, terjemahan, perawi, sahabat, nama kitab, nomor hadis.

---

## 20. Hadith Source Verification

Status: `verified`, `partially_verified`, `unverified`, `not_identified`

Sistem **tidak boleh** menyatakan sebuah hadis sahih hanya karena teksnya berhasil dikenali.

---

## 21. No Hallucination Rule

**MANDATORY:** Sistem dilarang mengarang ayat, hadis, nomor, nama kitab, nama perawi, referensi, atau melengkapi teks Arab berdasarkan tebakan.

Jika tidak yakin: `verification_status: unverified`

---

## 22. Confidence & Verification

```json
{
  "text": "إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ",
  "transcription_confidence": 0.81,
  "source_verification": "verified"
}
```

STT confidence tinggi ≠ teks agama benar.

---

## 23. Religious Content Segmentation

Pisahkan ucapan biasa dan teks agama dalam transcript.

---

## 24. Mixed Language Handling

Pertahankan pergantian bahasa (ID ↔ AR ↔ EN) dalam segment.

---

## 25. Batch Processing

Kegagalan satu video **tidak boleh** menghentikan proses video lainnya.

---

## 26. Processing Status

Status: `pending`, `processing`, `completed`, `failed`, `skipped`

---

## 27. Duplicate Handling

Video ID menjadi identifier utama. Video yang sama tidak diproses ulang.

---

## 28. Retry Mechanism

`MAX_RETRIES = 3`. Error permanen tidak diulang.

---

## 29. Error Handling

Error yang ditangani:

- Invalid URL
- Video unavailable / private
- Transcript unavailable
- Audio extraction failed
- Speech-to-text failed
- API rate limit

---

## 30. Output

### TXT

```
TITLE: Judul Video
URL: https://www.youtube.com/watch?v=abc123

TRANSCRIPT:
[00:00:03] Selamat datang di video kali ini.
[00:00:08] Hari ini kita akan membahas...
```

### JSON

```json
{
  "video_id": "abc123",
  "title": "Judul Video",
  "language": "id",
  "status": "completed",
  "segments": []
}
```

### CSV

Kolom: `video_id`, `title`, `url`, `channel`, `language`, `duration`, `transcription_source`, `status`, `transcript_file`, `error`

---

## 31. Final JSON Structure

```json
{
  "video_id": "abc123",
  "video_url": "https://www.youtube.com/watch?v=abc123",
  "title": "Kajian Tentang Kesabaran",
  "channel": "Example Channel",
  "duration": 1245,
  "language": "id",
  "status": "completed",
  "transcription_source": "speech_to_text",
  "segments": [
    {
      "start": 0,
      "end": 5,
      "type": "speech",
      "language": "id",
      "text": "Pada kesempatan kali ini kita akan membahas tentang sabar."
    },
    {
      "start": 5,
      "end": 12,
      "type": "quran",
      "language": "ar",
      "text": "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا",
      "reference": {
        "surah": "Ash-Sharh",
        "ayah": 5
      },
      "verification_status": "verified"
    },
    {
      "start": 12,
      "end": 20,
      "type": "speech",
      "language": "id",
      "text": "Sesungguhnya bersama kesulitan ada kemudahan."
    }
  ]
}
```

---

## 32. File Structure

```
output/
├── transcripts/
│   ├── abc123.txt
│   ├── def456.txt
│   └── ghi789.txt
├── json/
│   ├── abc123.json
│   ├── def456.json
│   └── ghi789.json
└── results.csv
```

---

## 33. System Architecture

```
                 INPUT
                   │
                   ▼
           YouTube URL Validator
                   │
                   ▼
            Video Metadata
                   │
                   ▼
        Existing Transcript Check
             /             \
          FOUND             NONE
            │                 │
            ▼                 ▼
     Get Transcript      Extract Audio
                              │
                              ▼
                       Speech-to-Text
                              │
                              ▼
                      Transcript Cleaning
                              │
                              ▼
                   Religious Content Detection
                         /              \
                      Quran           Hadith
                        │                 │
                        ▼                 ▼
                 Reference          Identification
                 Detection               │
                        │                 ▼
                        ▼          Source Verification
                 Quran Source             │
                 Verification             │
                        └────────┬────────┘
                                 ▼
                       Transcript Assembly
                                 │
                                 ▼
                           Save Results
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
                   TXT          JSON         CSV
```

---

## 34. Recommended Code Architecture

```
src/
├── youtube/
│   ├── validator.js
│   ├── metadata.js
│   └── transcript.js
├── transcription/
│   ├── audio.js
│   ├── speechToText.js
│   ├── languageDetection.js
│   └── cleaner.js
├── religious/
│   ├── detector.js
│   ├── quran.js
│   ├── hadith.js
│   └── verifier.js
├── processing/
│   ├── processor.js
│   ├── queue.js
│   ├── retry.js
│   └── duplicate.js
├── output/
│   ├── json.js
│   ├── txt.js
│   └── csv.js
├── utils/
│   └── logger.js
└── index.js
```

---

## 35. Core Processing Logic

```javascript
async function processVideo(url) {
    validateYouTubeUrl(url);
    const videoId = extractVideoId(url);
    if (await alreadyProcessed(videoId)) {
        return getExistingResult(videoId);
    }
    const metadata = await getVideoMetadata(videoId);
    let transcript = await getExistingTranscript(videoId);
    let source = "youtube_transcript";
    if (!transcript) {
        const audio = await extractAudio(videoId);
        transcript = await transcribeAudio(audio);
        source = "speech_to_text";
    }
    transcript = cleanTranscript(transcript);
    const religiousSegments = await detectReligiousContent(transcript);
    const verifiedSegments = await verifyReligiousContent(religiousSegments);
    const finalTranscript = assembleTranscript(transcript, verifiedSegments);
    return saveResult({ metadata, source, transcript: finalTranscript });
}
```

---

## 36. Batch Processing Logic

```javascript
async function processVideos(urls) {
    const results = [];
    for (const url of urls) {
        try {
            const result = await processVideo(url);
            results.push(result);
        } catch (error) {
            results.push({ url, status: "failed", error: error.message });
        }
    }
    return results;
}
```

---

## 37. Logging

Log aktivitas penting. **Jangan** log API key, token, password, credential.

---

## 38. Progress Tracking

```
Processing videos...
70/100 videos processed
Completed: 64
Failed: 6
Remaining: 30
```

---

## 39. Security

- Gunakan environment variables untuk credentials
- Hapus temporary audio setelah proses selesai
- `.env` tidak boleh masuk repository

---

## 40. Performance Requirements

- Proses individual dan batch
- Batch tidak berhenti jika satu gagal
- Gunakan existing transcript sebelum STT
- Hapus temp files

---

## 41. Acceptance Criteria

*(Lihat daftar lengkap di dokumen asli — mencakup Input, Video Processing, Religious Content, Batch Processing, dan Output)*

---

## 42. Critical Religious Content Rules

1. Jangan mengarang ayat Al-Qur'an.
2. Jangan mengarang hadis.
3. Jangan mengarang nomor ayat/hadis.
4. Jangan mengarang nama kitab/perawi.
5. Jangan mengarang referensi.
6. Jangan mengubah lafaz Arab berdasarkan tebakan AI.
7. Jangan menganggap STT sebagai sumber kebenaran teks agama.
8. Jika tidak yakin, tandai sebagai `unverified`.
9. Gunakan sumber terpercaya untuk verifikasi.
10. Pisahkan hasil STT dengan teks agama yang diverifikasi.
11. Pertahankan timestamp untuk setiap segment.
12. Jangan mengubah terjemahan yang diucapkan pembicara.

---

## 43. Final Processing Principle

**Konten umum:** *Transcribe what was said.*

**Konten keagamaan:** *Transcribe what was said, then verify what can be verified. Never guess what was not verified.*

---

## 44. Final End-to-End Workflow

```
YouTube URL → Validate → Extract Video ID → Get Metadata → Check Transcript
  → [YES] Get Transcript / [NO] Extract Audio → STT
  → Language Detection → Cleaning → Religious Content Detection
  → [Quran] Detect & Verify / [Hadith] Detect & Verify
  → Transcript Assembly → Duplicate Check → Save Results
  → TXT + JSON + CSV → Final Transcript
```

---

## 45. Future Expansion

```
YouTube Scraping → Niche Classification → URLs → Transcription System
→ Verified Transcript → Content Analysis → Topic/Chapter Extraction
→ Research & Source Collection → AI Ebook Writer → Final Ebook
```
