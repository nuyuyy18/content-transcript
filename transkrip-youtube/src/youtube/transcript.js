/**
 * YouTube Transcript Retriever
 * Mengambil transcript/subtitle yang sudah tersedia di YouTube
 * 
 * Priority:
 *   1. YouTube's built-in transcript (manual captions)
 *   2. Auto-generated captions
 */

import logger from '../utils/logger.js';

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
          const segments = transcriptItems.map(item => ({
            start: item.offset / 1000,  // Convert ms to seconds
            end: (item.offset + item.duration) / 1000,
            text: item.text,
            language: lang,
          }));

          logger.info(`Transcript found: ${segments.length} segments in "${lang}"`);
          
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
        const segments = transcriptItems.map(item => ({
          start: item.offset / 1000,
          end: (item.offset + item.duration) / 1000,
          text: item.text,
          language: 'unknown',
        }));

        logger.info(`Transcript found (auto): ${segments.length} segments`);
        
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

export default { getExistingTranscript };
