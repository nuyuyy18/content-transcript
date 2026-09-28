/**
 * Quran Module
 * Mengambil dan memverifikasi teks Al-Qur'an dari sumber terpercaya
 * 
 * Sumber: API alquran.cloud (gratis, open-source)
 * 
 * PRINSIP UTAMA:
 *   - STT BUKAN sumber kebenaran untuk teks Al-Qur'an
 *   - Teks yang terverifikasi harus dari sumber terpercaya
 *   - Jika tidak yakin, jangan menebak
 */

import logger from '../utils/logger.js';

/**
 * Base URL untuk API Al-Qur'an
 */
const QURAN_API_BASE = process.env.QURAN_API_URL || 'https://api.alquran.cloud/v1';

/**
 * Mapping nama surat ke nomor surat
 * Mencakup nama dalam bahasa Arab latin dan bahasa Indonesia
 */
const SURAH_MAP = {
  'al-fatihah': 1, 'alfatihah': 1, 'fatihah': 1,
  'al-baqarah': 2, 'albaqarah': 2, 'baqarah': 2,
  'ali imran': 3, 'ali-imran': 3, 'al-imran': 3,
  'an-nisa': 4, 'annisa': 4, 'nisa': 4,
  'al-maidah': 5, 'almaidah': 5, 'maidah': 5,
  'al-anam': 6, 'al-an\'am': 6, 'anam': 6,
  'al-araf': 7, 'al-a\'raf': 7, 'araf': 7,
  'al-anfal': 8, 'anfal': 8,
  'at-taubah': 9, 'taubah': 9, 'tawbah': 9,
  'yunus': 10,
  'hud': 11,
  'yusuf': 12,
  'ar-rad': 13, 'ar-ra\'d': 13, 'rad': 13,
  'ibrahim': 14,
  'al-hijr': 15, 'hijr': 15,
  'an-nahl': 16, 'nahl': 16,
  'al-isra': 17, 'isra': 17,
  'al-kahf': 18, 'kahf': 18,
  'maryam': 19,
  'taha': 20,
  'al-anbiya': 21, 'anbiya': 21,
  'al-hajj': 22, 'hajj': 22,
  'al-muminun': 23, 'al-mu\'minun': 23, 'muminun': 23,
  'an-nur': 24, 'nur': 24,
  'al-furqan': 25, 'furqan': 25,
  'asy-syuara': 26, 'asy-syu\'ara': 26, 'syuara': 26,
  'an-naml': 27, 'naml': 27,
  'al-qasas': 28, 'qasas': 28,
  'al-ankabut': 29, 'ankabut': 29,
  'ar-rum': 30, 'rum': 30,
  'luqman': 31,
  'as-sajdah': 32, 'sajdah': 32,
  'al-ahzab': 33, 'ahzab': 33,
  'saba': 34,
  'fatir': 35,
  'yasin': 36, 'ya sin': 36,
  'as-saffat': 37, 'saffat': 37,
  'sad': 38,
  'az-zumar': 39, 'zumar': 39,
  'ghafir': 40, 'al-mu\'min': 40,
  'fussilat': 41,
  'asy-syura': 42, 'syura': 42,
  'az-zukhruf': 43, 'zukhruf': 43,
  'ad-dukhan': 44, 'dukhan': 44,
  'al-jasiyah': 45, 'jasiyah': 45,
  'al-ahqaf': 46, 'ahqaf': 46,
  'muhammad': 47,
  'al-fath': 48, 'fath': 48,
  'al-hujurat': 49, 'hujurat': 49,
  'qaf': 50,
  'az-zariyat': 51, 'zariyat': 51,
  'at-tur': 52, 'tur': 52,
  'an-najm': 53, 'najm': 53,
  'al-qamar': 54, 'qamar': 54,
  'ar-rahman': 55, 'rahman': 55,
  'al-waqiah': 56, 'al-waqi\'ah': 56, 'waqiah': 56,
  'al-hadid': 57, 'hadid': 57,
  'al-mujadilah': 58, 'mujadilah': 58,
  'al-hasyr': 59, 'hasyr': 59,
  'al-mumtahanah': 60, 'mumtahanah': 60,
  'as-saff': 61, 'saff': 61,
  'al-jumuah': 62, 'al-jumu\'ah': 62, 'jumuah': 62,
  'al-munafiqun': 63, 'munafiqun': 63,
  'at-taghabun': 64, 'taghabun': 64,
  'at-talaq': 65, 'talaq': 65,
  'at-tahrim': 66, 'tahrim': 66,
  'al-mulk': 67, 'mulk': 67,
  'al-qalam': 68, 'qalam': 68,
  'al-haqqah': 69, 'haqqah': 69,
  'al-maarij': 70, 'al-ma\'arij': 70, 'maarij': 70,
  'nuh': 71,
  'al-jinn': 72, 'jinn': 72,
  'al-muzzammil': 73, 'muzzammil': 73,
  'al-muddassir': 74, 'muddassir': 74,
  'al-qiyamah': 75, 'qiyamah': 75,
  'al-insan': 76, 'insan': 76,
  'al-mursalat': 77, 'mursalat': 77,
  'an-naba': 78, 'naba': 78,
  'an-naziat': 79, 'an-nazi\'at': 79, 'naziat': 79,
  'abasa': 80,
  'at-takwir': 81, 'takwir': 81,
  'al-infitar': 82, 'infitar': 82,
  'al-mutaffifin': 83, 'mutaffifin': 83,
  'al-insyiqaq': 84, 'insyiqaq': 84,
  'al-buruj': 85, 'buruj': 85,
  'at-tariq': 86, 'tariq': 86,
  'al-ala': 87, 'al-a\'la': 87, 'ala': 87,
  'al-gasyiyah': 88, 'gasyiyah': 88,
  'al-fajr': 89, 'fajr': 89,
  'al-balad': 90, 'balad': 90,
  'asy-syams': 91, 'syams': 91,
  'al-lail': 92, 'lail': 92,
  'ad-duha': 93, 'duha': 93,
  'al-insyirah': 94, 'asy-syarh': 94, 'insyirah': 94, 'ash-sharh': 94,
  'at-tin': 95, 'tin': 95,
  'al-alaq': 96, 'al-\'alaq': 96, 'alaq': 96,
  'al-qadr': 97, 'qadr': 97,
  'al-bayyinah': 98, 'bayyinah': 98,
  'az-zalzalah': 99, 'zalzalah': 99,
  'al-adiyat': 100, 'al-\'adiyat': 100, 'adiyat': 100,
  'al-qariah': 101, 'al-qari\'ah': 101, 'qariah': 101,
  'at-takasur': 102, 'takasur': 102,
  'al-asr': 103, 'al-\'asr': 103, 'asr': 103,
  'al-humazah': 104, 'humazah': 104,
  'al-fil': 105, 'fil': 105,
  'quraisy': 106, 'quraish': 106,
  'al-maun': 107, 'al-ma\'un': 107, 'maun': 107,
  'al-kausar': 108, 'kausar': 108, 'al-kautsar': 108,
  'al-kafirun': 109, 'kafirun': 109,
  'an-nasr': 110, 'nasr': 110,
  'al-lahab': 111, 'al-masad': 111, 'lahab': 111,
  'al-ikhlas': 112, 'ikhlas': 112,
  'al-falaq': 113, 'falaq': 113,
  'an-nas': 114, 'nas': 114,
};

/**
 * Resolve nama surat ke nomor surat
 * @param {string} surahName - Nama surat
 * @returns {number|null} Nomor surat atau null
 */
export function resolveSurahNumber(surahName) {
  if (!surahName) return null;
  
  const normalized = surahName.toLowerCase().trim()
    .replace(/[''`]/g, "'")
    .replace(/\s+/g, ' ');
  
  return SURAH_MAP[normalized] || null;
}

/**
 * Ambil teks ayat Al-Qur'an dari API terpercaya
 * @param {number} surahNumber - Nomor surat (1-114)
 * @param {number} ayahNumber - Nomor ayat
 * @returns {Promise<Object>} Verified ayah data
 */
export async function getVerifiedAyah(surahNumber, ayahNumber) {
  logger.info(`Fetching verified Quran text: Surah ${surahNumber}, Ayah ${ayahNumber}`);

  try {
    // Ambil teks Arab (Uthmani script)
    const arabicUrl = `${QURAN_API_BASE}/ayah/${surahNumber}:${ayahNumber}/ar.alafasy`;
    const arabicResponse = await fetch(arabicUrl);
    
    if (!arabicResponse.ok) {
      throw new Error(`Quran API returned ${arabicResponse.status}`);
    }
    
    const arabicData = await arabicResponse.json();
    
    if (arabicData.code !== 200 || !arabicData.data) {
      throw new Error('Invalid response from Quran API');
    }

    const ayahData = arabicData.data;

    // Ambil terjemahan Indonesia
    let translation = null;
    try {
      const translationUrl = `${QURAN_API_BASE}/ayah/${surahNumber}:${ayahNumber}/id.indonesian`;
      const translationResponse = await fetch(translationUrl);
      
      if (translationResponse.ok) {
        const translationData = await translationResponse.json();
        if (translationData.code === 200 && translationData.data) {
          translation = translationData.data.text;
        }
      }
    } catch (translationError) {
      logger.warn(`Translation fetch failed: ${translationError.message}`);
    }

    const result = {
      surah_name: ayahData.surah?.englishName || `Surah ${surahNumber}`,
      surah_name_arabic: ayahData.surah?.name || null,
      surah_number: surahNumber,
      ayah: ayahNumber,
      arabic_text: ayahData.text,
      translation_id: translation,
      verification_status: 'verified',
      source: 'alquran.cloud',
    };

    logger.info(`Quran text verified: ${result.surah_name} ${result.ayah}`);
    return result;

  } catch (error) {
    logger.error(`Quran verification failed: ${error.message}`);
    return {
      surah_number: surahNumber,
      ayah: ayahNumber,
      arabic_text: null,
      translation_id: null,
      verification_status: 'unverified',
      error: error.message,
    };
  }
}

/**
 * Verifikasi referensi Al-Qur'an dari segment
 * @param {Object} segment - Segment with detected Quran reference
 * @param {Object} reference - {surah: string, ayah: number}
 * @returns {Promise<Object>} Verified segment
 */
export async function verifyQuranSegment(segment, reference) {
  if (!reference || !reference.surah) {
    return {
      ...segment,
      verification_status: 'unknown',
      reference_status: 'unknown',
    };
  }

  const surahNumber = resolveSurahNumber(reference.surah);
  
  if (!surahNumber) {
    logger.warn(`Cannot resolve surah name: ${reference.surah}`);
    return {
      ...segment,
      reference: {
        surah: reference.surah,
        ayah: reference.ayah,
      },
      verification_status: 'unverified',
      reference_status: 'surah_not_resolved',
    };
  }

  const verified = await getVerifiedAyah(surahNumber, reference.ayah);

  return {
    ...segment,
    type: 'quran',
    reference: {
      surah: verified.surah_name || reference.surah,
      surah_arabic: verified.surah_name_arabic,
      surah_number: surahNumber,
      ayah: reference.ayah,
    },
    verified_arabic_text: verified.arabic_text,
    verified_translation: verified.translation_id,
    verification_status: verified.verification_status,
    verification_source: verified.source,
  };
}

export default {
  resolveSurahNumber,
  getVerifiedAyah,
  verifyQuranSegment,
  SURAH_MAP,
};
