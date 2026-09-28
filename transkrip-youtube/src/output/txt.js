/**
 * TXT Output Module
 * Menyimpan hasil transcript dalam format TXT yang mudah dibaca manusia
 * 
 * Output path: {outputDir}/transcripts/{videoId}.txt
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import logger from '../utils/logger.js';

/**
 * Format detik menjadi [HH:MM:SS]
 * @param {number} seconds
 * @returns {string}
 */
function formatTimestamp(seconds) {
  if (seconds == null || isNaN(seconds)) return '[--:--:--]';
  
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  return `[${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}]`;
}

/**
 * Format tipe segment untuk TXT
 * @param {Object} segment
 * @returns {string}
 */
function formatSegmentType(segment) {
  switch (segment.type) {
    case 'quran':
      if (segment.reference) {
        return `[Quran — ${segment.reference.surah || 'Unknown'} : ${segment.reference.ayah || '?'}]`;
      }
      return '[Quran]';
    case 'hadith':
      if (segment.reference && segment.reference.book) {
        return `[Hadith — ${segment.reference.book}${segment.reference.number ? ' #' + segment.reference.number : ''}]`;
      }
      return '[Hadith]';
    case 'doa':
      return '[Doa]';
    case 'dzikir':
      return '[Dzikir]';
    case 'arabic_text':
      return '[Arabic]';
    default:
      return '';
  }
}

/**
 * Simpan hasil transcript sebagai TXT
 * @param {Object} result - Processing result
 * @param {string} outputDir - Output directory
 */
export async function saveTXT(result, outputDir = 'result') {
  const txtDir = join(outputDir, 'transcripts');
  
  if (!existsSync(txtDir)) {
    mkdirSync(txtDir, { recursive: true });
  }

  const videoId = result.video_id;
  if (!videoId) {
    logger.warn('Cannot save TXT: no video_id');
    return;
  }

  const filePath = join(txtDir, `${videoId}.txt`);

  try {
    let content = '';

    // Header
    content += '═'.repeat(60) + '\n';
    content += `TITLE:\n${result.title || 'Unknown Title'}\n\n`;
    content += `URL:\n${result.video_url || 'N/A'}\n\n`;
    content += `CHANNEL:\n${result.channel || 'Unknown'}\n\n`;
    
    if (result.duration) {
      const mins = Math.floor(result.duration / 60);
      const secs = result.duration % 60;
      content += `DURATION:\n${mins}m ${secs}s\n\n`;
    }
    
    content += `LANGUAGE:\n${result.language || 'Unknown'}\n\n`;
    content += `TRANSCRIPTION SOURCE:\n${result.transcription_source || 'Unknown'}\n\n`;
    content += `PROCESSED AT:\n${result.processed_at || new Date().toISOString()}\n`;
    content += '═'.repeat(60) + '\n\n';

    // Transcript
    content += 'TRANSCRIPT:\n';
    content += '─'.repeat(40) + '\n\n';

    if (result.segments && result.segments.length > 0) {
      for (const segment of result.segments) {
        const timestamp = formatTimestamp(segment.start);
        const typeLabel = formatSegmentType(segment);
        const langTag = segment.language && segment.language !== 'unknown'
          ? ` [${segment.language.toUpperCase()}]`
          : '';

        content += `${timestamp}${langTag}`;
        
        if (typeLabel) {
          content += ` ${typeLabel}`;
        }
        
        content += '\n';
        content += `${segment.text}\n`;

        // Jika ada teks terverifikasi (Quran), tampilkan juga
        if (segment.verified_arabic_text) {
          content += `\n  ▸ Verified Arabic:\n  ${segment.verified_arabic_text}\n`;
        }
        if (segment.verified_translation) {
          content += `  ▸ Translation:\n  ${segment.verified_translation}\n`;
        }
        if (segment.verification_status) {
          content += `  ▸ Verification: ${segment.verification_status}\n`;
        }

        content += '\n';
      }
    } else {
      content += '(No transcript segments available)\n';
    }

    content += '─'.repeat(40) + '\n';
    content += `END OF TRANSCRIPT\n`;

    writeFileSync(filePath, content, 'utf-8');
    logger.info(`TXT saved: ${filePath}`);
  } catch (error) {
    logger.error(`Failed to save TXT: ${error.message}`);
    throw error;
  }
}

export default { saveTXT };
