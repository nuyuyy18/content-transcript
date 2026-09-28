/**
 * Hadith Module
 * Menangani identifikasi dan verifikasi referensi hadis
 * 
 * PRINSIP:
 *   - Tidak boleh mengarang hadis atau referensinya
 *   - Tidak boleh menyatakan sahih hanya karena teks terkenali
 *   - Jika tidak yakin → unverified
 */

import logger from '../utils/logger.js';

/**
 * Daftar kitab hadis utama yang dikenali
 */
const HADITH_BOOKS = {
  'bukhari': { full_name: 'Sahih al-Bukhari', compiler: 'Imam al-Bukhari' },
  'muslim': { full_name: 'Sahih Muslim', compiler: 'Imam Muslim' },
  'tirmidzi': { full_name: 'Jami at-Tirmidhi', compiler: 'Imam at-Tirmidhi' },
  'tirmizi': { full_name: 'Jami at-Tirmidhi', compiler: 'Imam at-Tirmidhi' },
  'abu dawud': { full_name: 'Sunan Abu Dawud', compiler: 'Imam Abu Dawud' },
  'abu daud': { full_name: 'Sunan Abu Dawud', compiler: 'Imam Abu Dawud' },
  'nasai': { full_name: "Sunan an-Nasa'i", compiler: "Imam an-Nasa'i" },
  'nasa\'i': { full_name: "Sunan an-Nasa'i", compiler: "Imam an-Nasa'i" },
  'ibnu majah': { full_name: 'Sunan Ibn Majah', compiler: 'Imam Ibn Majah' },
  'ahmad': { full_name: 'Musnad Ahmad', compiler: 'Imam Ahmad' },
  'malik': { full_name: "Muwatta' Imam Malik", compiler: 'Imam Malik' },
  'darimi': { full_name: 'Sunan ad-Darimi', compiler: 'Imam ad-Darimi' },
};

/**
 * Daftar nama sahabat/perawi yang umum disebut
 */
const KNOWN_NARRATORS = [
  'abu hurairah', 'abu huraira',
  'anas bin malik', 'anas',
  'ibnu umar', 'ibn umar', 'abdullah bin umar',
  'ibnu abbas', 'ibn abbas', 'abdullah bin abbas',
  'aisyah', 'aisha',
  'jabir', 'jabir bin abdullah',
  'abu said', 'abu sa\'id', 'abu said al-khudri',
  'umar bin khattab', 'umar',
  'abu bakar', 'abu bakr',
  'ali bin abi thalib', 'ali',
  'utsman bin affan', 'utsman',
  'muadz bin jabal', 'muadz',
  'abu musa', 'abu musa al-asy\'ari',
  'abdullah bin amr',
  'ibnu masud', 'abdullah bin masud',
];

/**
 * Resolve nama kitab hadis
 * @param {string} sourceName - Nama kitab/perawi
 * @returns {Object|null} Info kitab hadis
 */
export function resolveHadithBook(sourceName) {
  if (!sourceName) return null;
  
  const normalized = sourceName.toLowerCase().trim();
  
  for (const [key, value] of Object.entries(HADITH_BOOKS)) {
    if (normalized.includes(key)) {
      return { key, ...value };
    }
  }
  
  return null;
}

/**
 * Deteksi narrator (perawi/sahabat) dalam teks
 * @param {string} text
 * @returns {string|null} Nama narrator yang terdeteksi
 */
export function detectNarrator(text) {
  if (!text) return null;
  
  const normalized = text.toLowerCase();
  
  for (const narrator of KNOWN_NARRATORS) {
    if (normalized.includes(narrator)) {
      return narrator;
    }
  }
  
  return null;
}

/**
 * Verifikasi segment hadis
 * Catatan: Verifikasi hadis lebih kompleks dari Al-Qur'an.
 * Untuk versi ini, sistem hanya mengidentifikasi dan mencatat referensi.
 * Sistem TIDAK boleh menyatakan status sahih/hasan/dhaif.
 * 
 * @param {Object} segment - Segment with detected hadith content
 * @param {Object} reference - {source, number, narrator}
 * @returns {Object} Verified hadith segment
 */
export function verifyHadithSegment(segment, reference) {
  logger.info('Verifying hadith segment');

  const result = {
    ...segment,
    type: 'hadith',
  };

  // Resolve kitab hadis jika ada referensi
  if (reference && reference.source) {
    const book = resolveHadithBook(reference.source);
    
    if (book) {
      result.reference = {
        book: book.full_name,
        book_key: book.key,
        compiler: book.compiler,
        number: reference.number || null,
      };
      result.verification_status = reference.number
        ? 'partially_verified'  // Kitab dikenali + ada nomor
        : 'partially_verified'; // Kitab dikenali tapi tanpa nomor
    } else {
      result.reference = {
        source_raw: reference.source,
        number: reference.number || null,
      };
      result.verification_status = 'unverified';
    }
  } else {
    result.verification_status = 'not_identified';
  }

  // Deteksi narrator
  const narrator = detectNarrator(segment.text);
  if (narrator) {
    result.narrator = narrator;
  }

  logger.info(`Hadith verification: ${result.verification_status}`);
  return result;
}

export default {
  resolveHadithBook,
  detectNarrator,
  verifyHadithSegment,
  HADITH_BOOKS,
  KNOWN_NARRATORS,
};
