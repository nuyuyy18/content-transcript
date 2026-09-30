/**
 * Transcript Cleaner
 * Membersihkan hasil transcript tanpa mengubah makna
 * 
 * BOLEH diperbaiki:
 *   - Spasi berlebihan
 *   - Baris kosong berlebihan
 *   - Karakter aneh / artefak
 *   - Duplikasi kata yang jelas merupakan error STT
 * 
 * TIDAK BOLEH:
 *   - Mengubah makna
 *   - Rewriting (misal: "gue" → "saya")
 *   - Mengubah gaya bicara
 */

import logger from '../utils/logger.js';

/**
 * Bersihkan teks transcript
 * @param {string} text - Teks untuk dibersihkan
 * @returns {string} Teks yang sudah dibersihkan
 */
export function cleanText(text) {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text;

  // 1. Hapus HTML entities & tags (artefak dari YouTube captions)
  cleaned = cleaned.replace(/<[^>]*>/g, '');
  cleaned = cleaned.replace(/&amp;/g, '&');
  cleaned = cleaned.replace(/&lt;/g, '<');
  cleaned = cleaned.replace(/&gt;/g, '>');
  cleaned = cleaned.replace(/&quot;/g, '"');
  cleaned = cleaned.replace(/&#39;/g, "'");
  cleaned = cleaned.replace(/&nbsp;/g, ' ');

  // 2. Hapus karakter kontrol (kecuali newline & tab)
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // 3. Normalkan whitespace (tanpa menghapus newline yang bermakna)
  cleaned = cleaned.replace(/[ \t]+/g, ' ');  // Multiple spaces → single space
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');  // Multiple blank lines → max 2

  // 4. Hapus artefak transcription umum
  cleaned = cleaned.replace(/\[musik\]/gi, '[Musik]');
  cleaned = cleaned.replace(/\[music\]/gi, '[Music]');
  cleaned = cleaned.replace(/\[tepuk tangan\]/gi, '[Tepuk Tangan]');
  cleaned = cleaned.replace(/\[applause\]/gi, '[Applause]');
  cleaned = cleaned.replace(/\[tertawa\]/gi, '[Tertawa]');
  cleaned = cleaned.replace(/\[laughter\]/gi, '[Laughter]');

  // 5. Hapus duplikasi kata berturut-turut yang jelas error STT
  // Contoh: "yang yang yang" → "yang"
  // Hanya jika 3x atau lebih berturut-turut (2x bisa disengaja)
  // Hanya berlaku untuk kata Latin (tidak menyentuh teks Arab)
  if (!/[\u0600-\u06FF]/.test(cleaned)) {
    cleaned = cleaned.replace(/\b([A-Za-z]+)(?:\s+\1){2,}\b/gi, '$1');
  }

  // 6. Trim
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Bersihkan seluruh segments transcript
 * @param {Array} segments - Array of transcript segments
 * @returns {Array} Cleaned segments
 */
export function cleanTranscript(segments) {
  logger.info(`Cleaning transcript: ${segments.length} segments`);

  const cleaned = [];
  
  for (const segment of segments) {
    const cleanedText = cleanText(segment.text);
    
    // Skip segment kosong setelah cleaning
    if (!cleanedText || cleanedText.length === 0) {
      continue;
    }

    cleaned.push({
      ...segment,
      text: cleanedText,
    });
  }

  // Merge segments yang terlalu pendek & berurutan
  const merged = mergeShortSegments(cleaned);

  logger.info(`Transcript cleaned: ${segments.length} → ${merged.length} segments`);
  return merged;
}

/**
 * Merge segments yang sangat pendek dan berurutan
 * (Sering terjadi pada YouTube auto-captions yang fragment per 1-2 kata)
 * @param {Array} segments
 * @param {number} [minLength=10] - Panjang minimum karakter
 * @returns {Array}
 */
function mergeShortSegments(segments, minLength = 10) {
  if (segments.length <= 1) return segments;

  const merged = [];
  let buffer = null;

  for (const segment of segments) {
    if (!buffer) {
      buffer = { ...segment };
      continue;
    }

    // Jika buffer terlalu pendek dan bahasa sama, merge
    // Tapi JANGAN merge segment keagamaan dengan apapun
    const isReligious = (seg) => ['quran','hadith','doa','dzikir','arabic_text','religious_speech'].includes(seg.type);
    if (buffer.text.length < minLength && buffer.language === segment.language
        && !isReligious(buffer) && !isReligious(segment)) {
      buffer.text = `${buffer.text} ${segment.text}`;
      buffer.end = segment.end;
      if (segment.confidence && buffer.confidence) {
        buffer.confidence = (buffer.confidence + segment.confidence) / 2;
      }
    } else {
      merged.push(buffer);
      buffer = { ...segment };
    }
  }

  if (buffer) {
    merged.push(buffer);
  }

  return merged;
}

export default { cleanText, cleanTranscript };
