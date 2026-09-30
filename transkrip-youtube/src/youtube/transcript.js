/**
 * YouTube Transcript Retriever
 * Mengambil transcript/subtitle yang sudah tersedia di YouTube
 * 
 * Priority:
 *   1. YouTube's built-in transcript (manual captions)
 *   2. Auto-generated captions
 * 
 * Gap Detection:
 *   Jika ada jeda waktu > GAP_THRESHOLD detik antar segment, kemungkinan besar
 *   YouTube auto-caption melewatkan bagian konten (terutama teks Arab/keagamaan).
 *   Sistem akan menyisipkan marker segmen gap untuk ditangani lebih lanjut.
 */

import logger from '../utils/logger.js';

/**
 * Ambang waktu (detik) untuk mendeteksi gap signifikan antar segment transcript.
 * Gap > nilai ini kemungkinan mengandung konten yang tidak tertranskrip.
 */
const GAP_THRESHOLD_SECONDS = 4.0;

/**
 * Deteksi jeda waktu (gap) yang signifikan antar segment transcript.
 * Gap yang besar sering terjadi saat pembicara melantunkan teks Arab (ayat, hadis, doa)
 * yang tidak bisa dikenali oleh auto-caption YouTube.
 *
 * @param {Array} segments - Array of transcript segments [{start, end, text, language}]
 * @returns {Array} Segments dengan gap markers yang disisipkan
 */
export function detectTranscriptGaps(segments) {
  if (!segments || segments.length < 2) return segments;

  const result = [];

  for (let i = 0; i < segments.length; i++) {
    result.push(segments[i]);

    if (i < segments.length - 1) {
      const currEnd = segments[i].end;
      const nextStart = segments[i + 1].start;
      const gap = nextStart - currEnd;

      if (gap > GAP_THRESHOLD_SECONDS) {
        logger.warn(
          `Transcript gap detected: ${formatSec(currEnd)} → ${formatSec(nextStart)} ` +
          `(${gap.toFixed(1)}s). Kemungkinan konten Arab/keagamaan tidak tertranskrip.`
        );

        // Sisipkan segment penanda gap
        result.push({
          start: currEnd,
          end: nextStart,
          text: '[KONTEN_TIDAK_TERTRANSKRIP — kemungkinan teks Arab/keagamaan, perlu verifikasi manual]',
          language: 'unknown',
          type: 'gap',
          gap_duration: parseFloat(gap.toFixed(2)),
          gap_reason: 'youtube_caption_gap',
        });
      }
    }
  }

  return result;
}

/** Format detik ke MM:SS untuk log */
function formatSec(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Mengambil existing transcript dari YouTube
 * @param {string} videoId - YouTube Video ID
 * @param {string} [preferredLang='id'] - Bahasa yang diinginkan
 * @returns {Promise<{available: boolean, segments: Array, language: string, source: string}>}
 */
export async function getExistingTranscript(videoId, preferredLang = 'id') {
  logger.info(`Checking existing transcript for video: ${videoId}`);

  try {
    const { YoutubeTranscript } = await import('youtube-transcript');
    
    // Coba bahasa yang preferred dulu
    const langPriority = [preferredLang, 'id', 'en', 'ar'];
    const uniqueLangs = [...new Set(langPriority)];

    for (const lang of uniqueLangs) {
      try {
        logger.debug(`Trying transcript language: ${lang}`);
        
        const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, { lang });
        
        if (transcriptItems && transcriptItems.length > 0) {
          const rawSegments = transcriptItems.map(item => ({
            start: item.offset / 1000,  // Convert ms to seconds
            end: (item.offset + item.duration) / 1000,
            text: item.text,
            language: lang,
          }));

          // Deteksi gap besar yang kemungkinan berisi konten tidak tertranskrip
          const segments = detectTranscriptGaps(rawSegments);

          logger.info(`Transcript found: ${segments.length} segments in "${lang}" (including gap markers)`);
          
          return {
            available: true,
            segments,
            language: lang,
            source: 'youtube_transcript',
          };
        }
      } catch (langError) {
        logger.debug(`No transcript for lang "${lang}": ${langError.message}`);
        continue;
      }
    }

    // Coba tanpa bahasa spesifik (ambil apapun yang tersedia)
    try {
      const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
      
      if (transcriptItems && transcriptItems.length > 0) {
        const rawSegments = transcriptItems.map(item => ({
          start: item.offset / 1000,
          end: (item.offset + item.duration) / 1000,
          text: item.text,
          language: 'unknown',
        }));

        // Deteksi gap besar yang kemungkinan berisi konten tidak tertranskrip
        const segments = detectTranscriptGaps(rawSegments);

        logger.info(`Transcript found (auto): ${segments.length} segments (including gap markers)`);
        
        return {
          available: true,
          segments,
          language: 'unknown',
          source: 'youtube_transcript_auto',
        };
      }
    } catch (autoError) {
      logger.debug(`No auto transcript available: ${autoError.message}`);
    }

    logger.warn(`No transcript available for video: ${videoId}`);
    return {
      available: false,
      segments: [],
      language: null,
      source: null,
    };

  } catch (error) {
    logger.error(`Transcript retrieval failed for ${videoId}: ${error.message}`);
    return {
      available: false,
      segments: [],
      language: null,
      source: null,
      error: error.message,
    };
  }
}

export default { getExistingTranscript, detectTranscriptGaps };
