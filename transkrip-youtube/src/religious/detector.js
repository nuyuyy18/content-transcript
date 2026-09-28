/**
 * Religious Content Detector
 * Mendeteksi bagian transcript yang kemungkinan mengandung konten keagamaan
 * 
 * Jenis konten yang dideteksi:
 *   - Al-Qur'an (ayat, surat)
 *   - Hadis (riwayat, kitab)
 *   - Doa & Dzikir
 *   - Lafaz Arab
 *   - Terjemahan ayat/hadis
 *   - Istilah keagamaan
 */

import { containsArabic, isMostlyArabic } from '../transcription/languageDetection.js';
import logger from '../utils/logger.js';

/**
 * Pattern penanda konten Al-Qur'an
 */
const QURAN_INDICATORS = [
  // Referensi langsung
  /(?:surat|surah)\s+[\w-]+\s+(?:ayat|ayah)\s+\d+/i,
  /(?:QS|Q\.S\.)\s*[\.\:]?\s*[\w-]+\s*[\.\:\[\(]\s*\d+/i,
  /\b(?:surat|surah)\s+[\w'-]+/i,
  /\b(?:al-|an-|at-|as-|ar-|az-|ad-|asy-)(?:fatihah|baqarah|imran|nisa|maidah|anam|a'?raf|anfal|taubah|hijr|nahl|isra|kahf|anbiya|hajj|muminun|mu'?minun|nur|furqan|syuara|syu'?ara|naml|qasas|ankabut|rum|sajdah|ahzab|saba|fatir|saffat|zumar|fussilat|syura|zukhruf|dukhan|jasiyah|ahqaf|fath|hujurat|zariyat|tur|najm|qamar|rahman|waqiah|waqi'?ah|hadid|mujadilah|hasyr|mumtahanah|saff|jumuah|jumu'?ah|munafiqun|taghabun|talaq|tahrim|mulk|qalam|haqqah|maarij|ma'?arij|jinn|muzzammil|muddassir|qiyamah|insan|mursalat|naba|naziat|nazi'?at|infitar|mutaffifin|insyiqaq|buruj|tariq|a'?la|gasyiyah|fajr|balad|syams|lail|duha|insyirah|tin|alaq|qadr|bayyinah|zalzalah|adiyat|qariah|qari'?ah|takasur|asr|humazah|fil|quraisy|maun|ma'?un|kausar|kafirun|nasr|lahab|ikhlas|falaq|nas)\b/i,
  /\b(?:yasin|maryam|taha|luqman|ibrahim|yunus|hud|yusuf)\b/i,
  
  // Penanda verbal
  /allah\s+(?:berfirman|ta'?ala|subhanahu)/i,
  /firman\s+allah/i,
  /dalam\s+(?:al-?qur'?an|kitabullah)/i,
  /ayat\s+(?:ini|tersebut|di\s+atas|berikut)/i,
];

/**
 * Pattern penanda konten Hadis
 */
const HADITH_INDICATORS = [
  /(?:rasulullah|nabi\s+muhammad|nabi\s+saw)\s+(?:bersabda|berkata|mengatakan)/i,
  /(?:hadis|hadits|hadith)\s+(?:riwayat|yang\s+diriwayatkan)/i,
  /(?:HR|H\.R\.)\s*[\.\:]?\s*(?:bukhari|muslim|tirmidzi|abu\s*dawud|nasa'?i|ibnu\s*majah|ahmad|malik|darimi)/i,
  /(?:sahih|shahih)\s+(?:bukhari|muslim)/i,
  /(?:riwayat|diriwayatkan)\s+(?:oleh\s+)?(?:bukhari|muslim|tirmidzi|abu\s*dawud|nasa'?i|ibnu\s*majah|ahmad)/i,
  /(?:dari|dari\s+sahabat)\s+(?:abu\s*hurairah|anas|ibnu\s*umar|ibnu\s*abbas|aisyah|jabir|abu\s*said)/i,
  /sallallahu\s+'?alaihi\s+wa\s+sallam/i,
  /shallallahu\s+'?alaihi\s+wa\s+sallam/i,
  /ﷺ/,
];

/**
 * Pattern penanda doa & dzikir
 */
const DOA_DZIKIR_INDICATORS = [
  /(?:doa|du'?a|dzikir|zikir)\s+(?:ini|tersebut|berikut|setelah|sesudah|sebelum)/i,
  /(?:bacalah|membaca|baca)\s+(?:doa|du'?a|dzikir|zikir)/i,
  /bismillah/i,
  /alhamdulillah/i,
  /subhanallah/i,
  /allahu\s*akbar/i,
  /astaghfirullah/i,
  /la\s+ilaha\s+illa/i,
];

/**
 * Tipe konten keagamaan
 */
const CONTENT_TYPES = {
  QURAN: 'quran',
  HADITH: 'hadith',
  DOA: 'doa',
  DZIKIR: 'dzikir',
  ARABIC_TEXT: 'arabic_text',
  RELIGIOUS_SPEECH: 'religious_speech',
  SPEECH: 'speech',
};

/**
 * Deteksi konten keagamaan dalam satu segment
 * @param {Object} segment - Transcript segment {text, start, end, language}
 * @returns {Object} Segment dengan informasi konten keagamaan
 */
export function detectReligiousSegment(segment) {
  const { text } = segment;
  
  if (!text) return { ...segment, type: CONTENT_TYPES.SPEECH };

  // Cek teks Arab murni
  if (isMostlyArabic(text)) {
    return {
      ...segment,
      type: CONTENT_TYPES.ARABIC_TEXT,
      religious_flags: ['arabic_text'],
    };
  }

  // Cek indikator Al-Qur'an
  const quranMatches = QURAN_INDICATORS.filter(p => p.test(text));
  if (quranMatches.length > 0) {
    return {
      ...segment,
      type: CONTENT_TYPES.QURAN,
      religious_flags: ['quran_indicator'],
    };
  }

  // Cek indikator Hadis
  const hadithMatches = HADITH_INDICATORS.filter(p => p.test(text));
  if (hadithMatches.length > 0) {
    return {
      ...segment,
      type: CONTENT_TYPES.HADITH,
      religious_flags: ['hadith_indicator'],
    };
  }

  // Cek indikator Doa/Dzikir
  const doaMatches = DOA_DZIKIR_INDICATORS.filter(p => p.test(text));
  if (doaMatches.length > 0) {
    return {
      ...segment,
      type: CONTENT_TYPES.DOA,
      religious_flags: ['doa_dzikir_indicator'],
    };
  }

  // Cek apakah mengandung campuran Arab
  if (containsArabic(text)) {
    return {
      ...segment,
      type: CONTENT_TYPES.RELIGIOUS_SPEECH,
      religious_flags: ['contains_arabic'],
    };
  }

  return {
    ...segment,
    type: CONTENT_TYPES.SPEECH,
  };
}

/**
 * Deteksi konten keagamaan untuk seluruh transcript
 * @param {Array} segments - Array of transcript segments
 * @returns {Array} Segments dengan deteksi konten keagamaan
 */
export function detectReligiousContent(segments) {
  logger.info(`Detecting religious content in ${segments.length} segments`);

  const result = segments.map(segment => detectReligiousSegment(segment));

  // Count detected types
  const typeCounts = {};
  for (const seg of result) {
    typeCounts[seg.type] = (typeCounts[seg.type] || 0) + 1;
  }

  logger.info('Religious content detection results:', typeCounts);
  return result;
}

/**
 * Ekstrak referensi Al-Qur'an dari teks
 * @param {string} text - Teks yang mungkin mengandung referensi ayat
 * @returns {Object|null} Referensi {surah, ayah} atau null
 */
export function extractQuranReference(text) {
  if (!text) return null;

  // Pattern: "surat X ayat Y" atau "surah X ayat Y"
  const surahAyahMatch = text.match(/(?:surat|surah)\s+([\w\s'-]+?)\s+(?:ayat|ayah)\s+(\d+)/i);
  if (surahAyahMatch) {
    return {
      surah: surahAyahMatch[1].trim(),
      ayah: parseInt(surahAyahMatch[2]),
    };
  }

  // Pattern: "QS. X: Y" atau "QS X [Y]" atau "QS. X (Y)"
  const qsMatch = text.match(/(?:QS|Q\.S\.)\s*[\.\:]?\s*([\w\s'-]+?)\s*[\.\:\[\(]\s*(\d+)/i);
  if (qsMatch) {
    return {
      surah: qsMatch[1].trim(),
      ayah: parseInt(qsMatch[2]),
    };
  }

  return null;
}

/**
 * Ekstrak referensi Hadis dari teks
 * @param {string} text
 * @returns {Object|null} Referensi {source, narrator} atau null
 */
export function extractHadithReference(text) {
  if (!text) return null;

  // Pattern: "HR. Bukhari" atau "Riwayat Muslim"
  const hrMatch = text.match(/(?:HR|H\.R\.)\s*[\.\:]?\s*([\w\s]+?)(?:\s+(?:no|nomor|hadis)\s*[\.\:]?\s*(\d+))?(?:\s|,|$)/i);
  if (hrMatch) {
    return {
      source: hrMatch[1].trim(),
      number: hrMatch[2] ? parseInt(hrMatch[2]) : null,
    };
  }

  // Pattern: "Riwayat Bukhari"
  const riwayatMatch = text.match(/(?:riwayat|diriwayatkan)\s+(?:oleh\s+)?([\w\s]+?)(?:\s+(?:no|nomor)\s*[\.\:]?\s*(\d+))?(?:\s|,|$)/i);
  if (riwayatMatch) {
    return {
      source: riwayatMatch[1].trim(),
      number: riwayatMatch[2] ? parseInt(riwayatMatch[2]) : null,
    };
  }

  return null;
}

export { CONTENT_TYPES };
export default {
  detectReligiousContent,
  detectReligiousSegment,
  extractQuranReference,
  extractHadithReference,
  CONTENT_TYPES,
};
