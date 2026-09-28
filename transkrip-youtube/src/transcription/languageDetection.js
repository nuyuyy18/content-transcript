/**
 * Language Detection Module
 * Mendeteksi bahasa setiap segment transcript
 * 
 * Mendukung:
 *   - Bahasa Indonesia (id)
 *   - Bahasa Inggris (en)
 *   - Bahasa Arab (ar)
 *   - Mixed language detection
 */

import logger from '../utils/logger.js';

/**
 * Pattern untuk deteksi bahasa Arab
 * Range Unicode untuk karakter Arab: \u0600-\u06FF, \u0750-\u077F, \u08A0-\u08FF, \uFB50-\uFDFF, \uFE70-\uFEFF
 */
const ARABIC_PATTERN = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const ARABIC_HEAVY_PATTERN = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]{3,}/;

/**
 * Kata kunci Bahasa Indonesia yang umum
 */
const ID_KEYWORDS = [
  'yang', 'dan', 'di', 'itu', 'dengan', 'untuk', 'pada', 'adalah', 'ini',
  'dari', 'dalam', 'akan', 'tidak', 'juga', 'sudah', 'saya', 'kita',
  'bisa', 'ada', 'mereka', 'kami', 'kalian', 'harus', 'bisa', 'agar',
  'bahwa', 'seperti', 'karena', 'jadi', 'kalau', 'maka', 'oleh',
  'gue', 'gua', 'lu', 'lo', 'nggak', 'enggak', 'udah', 'banget',
  'tuh', 'nih', 'dong', 'deh', 'sih', 'kan', 'lho', 'kok',
];

/**
 * Kata kunci Bahasa Inggris yang umum
 */
const EN_KEYWORDS = [
  'the', 'and', 'is', 'are', 'was', 'were', 'have', 'has', 'had',
  'will', 'would', 'could', 'should', 'can', 'this', 'that', 'with',
  'from', 'they', 'been', 'said', 'each', 'which', 'their', 'about',
  'just', 'like', 'know', 'think', 'going', 'really', 'actually',
];

/**
 * Deteksi bahasa dari teks
 * @param {string} text - Teks untuk dideteksi
 * @returns {string} Kode bahasa: 'id', 'en', 'ar', atau 'unknown'
 */
export function detectLanguage(text) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return 'unknown';
  }

  const trimmed = text.trim();

  // Cek Arab: jika mayoritas karakter adalah Arab
  const arabicChars = (trimmed.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length;
  const totalChars = trimmed.replace(/\s/g, '').length;

  if (totalChars > 0 && arabicChars / totalChars > 0.5) {
    return 'ar';
  }

  // Cek dengan keyword matching
  const words = trimmed.toLowerCase().split(/\s+/);
  
  let idScore = 0;
  let enScore = 0;

  for (const word of words) {
    if (ID_KEYWORDS.includes(word)) idScore++;
    if (EN_KEYWORDS.includes(word)) enScore++;
  }

  // Normalisasi score
  const wordCount = words.length;
  const idRatio = idScore / wordCount;
  const enRatio = enScore / wordCount;

  if (idRatio > enRatio && idRatio > 0.1) return 'id';
  if (enRatio > idRatio && enRatio > 0.1) return 'en';
  
  // Default ke Indonesian jika tidak jelas
  if (idScore > 0) return 'id';
  if (enScore > 0) return 'en';

  return 'unknown';
}

/**
 * Deteksi apakah text mengandung teks Arab
 * @param {string} text
 * @returns {boolean}
 */
export function containsArabic(text) {
  return ARABIC_PATTERN.test(text);
}

/**
 * Deteksi apakah text mayoritas Arab
 * @param {string} text
 * @returns {boolean}
 */
export function isMostlyArabic(text) {
  return ARABIC_HEAVY_PATTERN.test(text);
}

/**
 * Deteksi bahasa untuk semua segments
 * @param {Array} segments - Array of transcript segments
 * @returns {Array} Segments dengan language tag
 */
export function detectSegmentLanguages(segments) {
  return segments.map(segment => ({
    ...segment,
    language: segment.language && segment.language !== 'unknown'
      ? segment.language
      : detectLanguage(segment.text),
  }));
}

/**
 * Deteksi bahasa dominan dari semua segments
 * @param {Array} segments
 * @returns {string} Bahasa dominan
 */
export function detectDominantLanguage(segments) {
  const langCount = {};
  
  for (const seg of segments) {
    const lang = seg.language || detectLanguage(seg.text);
    if (lang !== 'unknown') {
      langCount[lang] = (langCount[lang] || 0) + 1;
    }
  }

  let dominant = 'unknown';
  let maxCount = 0;
  
  for (const [lang, count] of Object.entries(langCount)) {
    if (count > maxCount) {
      maxCount = count;
      dominant = lang;
    }
  }

  return dominant;
}

export default {
  detectLanguage,
  containsArabic,
  isMostlyArabic,
  detectSegmentLanguages,
  detectDominantLanguage,
};
