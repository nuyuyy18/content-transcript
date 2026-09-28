/**
 * Religious Content Verifier
 * Orchestrator untuk verifikasi konten keagamaan (Al-Qur'an & Hadis)
 * 
 * ATURAN WAJIB:
 *   1. Jangan mengarang ayat Al-Qur'an
 *   2. Jangan mengarang hadis
 *   3. Jangan mengarang nomor ayat/hadis
 *   4. Jangan mengarang nama kitab/perawi
 *   5. Jangan mengarang referensi
 *   6. Jangan mengubah lafaz Arab berdasarkan tebakan AI
 *   7. Jangan menganggap STT sebagai sumber kebenaran teks agama
 *   8. Jika tidak yakin → unverified
 *   9. Gunakan sumber terpercaya untuk verifikasi
 *   10. Pisahkan hasil STT dengan teks agama yang diverifikasi
 */

import { extractQuranReference, extractHadithReference, CONTENT_TYPES } from './detector.js';
import { verifyQuranSegment } from './quran.js';
import { verifyHadithSegment } from './hadith.js';
import logger from '../utils/logger.js';

/**
 * Verifikasi seluruh konten keagamaan dalam segments
 * @param {Array} segments - Segments yang sudah melalui religious content detection
 * @returns {Promise<Array>} Segments yang sudah diverifikasi
 */
export async function verifyReligiousContent(segments) {
  logger.info(`Verifying religious content in ${segments.length} segments`);

  const verified = [];
  let quranVerified = 0;
  let hadithProcessed = 0;

  for (const segment of segments) {
    switch (segment.type) {
      case CONTENT_TYPES.QURAN: {
        // Coba ekstrak referensi Al-Qur'an
        const quranRef = extractQuranReference(segment.text);
        
        if (quranRef) {
          const verifiedSegment = await verifyQuranSegment(segment, quranRef);
          verified.push(verifiedSegment);
          if (verifiedSegment.verification_status === 'verified') {
            quranVerified++;
          }
        } else {
          // Referensi tidak ditemukan — jangan menebak
          verified.push({
            ...segment,
            type: CONTENT_TYPES.QURAN,
            verification_status: 'unknown',
            reference_status: 'unknown',
          });
        }
        break;
      }

      case CONTENT_TYPES.HADITH: {
        // Coba ekstrak referensi hadis
        const hadithRef = extractHadithReference(segment.text);
        const verifiedSegment = verifyHadithSegment(segment, hadithRef);
        verified.push(verifiedSegment);
        hadithProcessed++;
        break;
      }

      case CONTENT_TYPES.ARABIC_TEXT: {
        // Teks Arab murni — tandai dan pertahankan
        verified.push({
          ...segment,
          type: CONTENT_TYPES.ARABIC_TEXT,
          verification_status: 'unverified',
          note: 'Arabic text detected from STT — not verified against trusted source',
        });
        break;
      }

      case CONTENT_TYPES.DOA:
      case CONTENT_TYPES.DZIKIR: {
        verified.push({
          ...segment,
          verification_status: 'unverified',
          note: 'Doa/dzikir detected — preserved as spoken',
        });
        break;
      }

      case CONTENT_TYPES.RELIGIOUS_SPEECH: {
        // Ucapan keagamaan biasa (mengandung istilah Arab tapi bukan ayat/hadis)
        verified.push({
          ...segment,
          verification_status: null,
        });
        break;
      }

      default: {
        // Konten umum (speech) — tidak perlu verifikasi
        verified.push(segment);
        break;
      }
    }
  }

  logger.info(`Verification complete: ${quranVerified} Quran verified, ${hadithProcessed} hadith processed`);
  return verified;
}

/**
 * Assembly transcript final
 * Menggabungkan segments biasa dengan segments yang sudah diverifikasi
 * @param {Array} segments - Verified segments
 * @returns {Array} Final assembled segments
 */
export function assembleTranscript(segments) {
  return segments.map(segment => {
    const assembled = {
      start: segment.start,
      end: segment.end,
      type: segment.type || 'speech',
      language: segment.language || 'unknown',
      text: segment.text,
    };

    // Tambahkan info confidence jika ada
    if (segment.confidence != null) {
      assembled.transcription_confidence = segment.confidence;
    }

    // Tambahkan referensi Al-Qur'an jika ada dan terverifikasi
    if (segment.type === 'quran' && segment.reference) {
      assembled.reference = segment.reference;
      assembled.verification_status = segment.verification_status;

      // Jika ada teks terverifikasi, sertakan
      if (segment.verified_arabic_text) {
        assembled.verified_arabic_text = segment.verified_arabic_text;
      }
      if (segment.verified_translation) {
        assembled.verified_translation = segment.verified_translation;
      }
      if (segment.verification_source) {
        assembled.verification_source = segment.verification_source;
      }
    }

    // Tambahkan referensi hadis jika ada
    if (segment.type === 'hadith') {
      if (segment.reference) {
        assembled.reference = segment.reference;
      }
      assembled.verification_status = segment.verification_status;
      if (segment.narrator) {
        assembled.narrator = segment.narrator;
      }
    }

    // Tambahkan status verifikasi untuk konten keagamaan lainnya
    if (['arabic_text', 'doa', 'dzikir'].includes(segment.type)) {
      assembled.verification_status = segment.verification_status || 'unverified';
    }

    return assembled;
  });
}

export default {
  verifyReligiousContent,
  assembleTranscript,
};
