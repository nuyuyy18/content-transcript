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
import OpenAI from 'openai';

/**
 * Menerjemahkan teks Latin berbau Arab (Indonesian transliteration) menjadi teks Arab asli (berharakat).
 */
async function transliterateToArabic(text) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.startsWith('sk-xxx')) return null;

  try {
    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an Arabic verification assistant. Convert any Indonesian Latin text that represents Arabic words, prayers, Quran verses, or Hadith into actual Arabic script with harakat (tashkeel). Leave normal Indonesian words as they are, but rewrite the Arabic parts into Arabic. Output ONLY the resulting string without any explanations or quotes.'
        },
        { role: 'user', content: text }
      ],
      temperature: 0.1,
    });
    return response.choices[0].message.content.trim();
  } catch (error) {
    logger.error('Failed to transliterate Arabic: ' + error.message);
    return null;
  }
}

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
    let processedSegment = null;

    switch (segment.type) {
      case CONTENT_TYPES.QURAN: {
        const quranRef = extractQuranReference(segment.text);
        if (quranRef) {
          processedSegment = await verifyQuranSegment(segment, quranRef);
          if (processedSegment.verification_status === 'verified') {
            quranVerified++;
          }
        } else {
          processedSegment = {
            ...segment,
            type: CONTENT_TYPES.QURAN,
            verification_status: 'unknown',
            reference_status: 'unknown',
          };
        }
        break;
      }
      case CONTENT_TYPES.HADITH: {
        const hadithRef = extractHadithReference(segment.text);
        processedSegment = verifyHadithSegment(segment, hadithRef);
        hadithProcessed++;
        break;
      }
      case CONTENT_TYPES.ARABIC_TEXT: {
        processedSegment = {
          ...segment,
          type: CONTENT_TYPES.ARABIC_TEXT,
          verification_status: 'unverified',
          note: 'Arabic text detected from STT — not verified against trusted source',
        };
        break;
      }
      case CONTENT_TYPES.DOA:
      case CONTENT_TYPES.DZIKIR: {
        processedSegment = {
          ...segment,
          verification_status: 'unverified',
          note: 'Doa/dzikir detected — preserved as spoken',
        };
        break;
      }
      case CONTENT_TYPES.RELIGIOUS_SPEECH: {
        processedSegment = {
          ...segment,
          verification_status: null,
        };
        break;
      }
      default: {
        processedSegment = { ...segment };
        break;
      }
    }

    // Terjemahkan lafaz Arab latin ke Arab berharakat jika itu teks keagamaan
    const religiousTypes = [
      CONTENT_TYPES.QURAN, CONTENT_TYPES.HADITH, CONTENT_TYPES.DOA, 
      CONTENT_TYPES.DZIKIR, CONTENT_TYPES.ARABIC_TEXT, CONTENT_TYPES.RELIGIOUS_SPEECH
    ];

    if (religiousTypes.includes(processedSegment.type)) {
      const translatedText = await transliterateToArabic(processedSegment.text);
      if (translatedText && translatedText !== processedSegment.text) {
        processedSegment.text = translatedText;
        if (!processedSegment.verification_status || processedSegment.verification_status === 'unverified') {
          processedSegment.verification_status = 'ai_translated';
        }
      }
    }

    verified.push(processedSegment);
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

    if (segment.confidence != null) {
      assembled.transcription_confidence = segment.confidence;
    }

    if (segment.type === 'quran' && segment.reference) {
      assembled.reference = segment.reference;
      assembled.verification_status = segment.verification_status;
      if (segment.verified_arabic_text) assembled.verified_arabic_text = segment.verified_arabic_text;
      if (segment.verified_translation) assembled.verified_translation = segment.verified_translation;
      if (segment.verification_source) assembled.verification_source = segment.verification_source;
    }

    if (segment.type === 'hadith') {
      if (segment.reference) assembled.reference = segment.reference;
      assembled.verification_status = segment.verification_status;
      if (segment.narrator) assembled.narrator = segment.narrator;
    }

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
