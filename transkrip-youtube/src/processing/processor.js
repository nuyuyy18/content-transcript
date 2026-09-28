/**
 * Main Video Processor
 * Orchestrator utama yang menjalankan seluruh pipeline pemrosesan video
 * 
 * Pipeline:
 *   URL → Validate → Metadata → Transcript/Audio → STT → Clean → 
 *   Detect Religious → Verify → Assembly → Save
 */

import { validateYouTubeUrl, extractVideoId, validateBatchUrls } from '../youtube/validator.js';
import { getVideoMetadata } from '../youtube/metadata.js';
import { getExistingTranscript } from '../youtube/transcript.js';
import { extractAudio, cleanupAudio } from '../transcription/audio.js';
import { transcribeAudio } from '../transcription/speechToText.js';
import { detectSegmentLanguages, detectDominantLanguage } from '../transcription/languageDetection.js';
import { cleanTranscript } from '../transcription/cleaner.js';
import { detectReligiousContent } from '../religious/detector.js';
import { verifyReligiousContent, assembleTranscript } from '../religious/verifier.js';
import { withRetry } from './retry.js';
import DuplicateHandler from './duplicate.js';
import ProcessingQueue from './queue.js';
import { saveJSON } from '../output/json.js';
import { saveTXT } from '../output/txt.js';
import { appendCSV, initCSV } from '../output/csv.js';
import logger from '../utils/logger.js';

/**
 * Proses satu video YouTube
 * @param {string} url - YouTube URL
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} Processing result
 */
export async function processVideo(url, options = {}) {
  const { outputDir = 'result', duplicateHandler } = options;

  // 1. Validasi URL
  logger.info(`Processing video: ${url}`);
  const validation = validateYouTubeUrl(url);
  
  if (!validation.valid) {
    return {
      url,
      status: 'failed',
      error: validation.error,
    };
  }

  const videoId = validation.videoId;

  // 2. Cek duplikat
  if (duplicateHandler && duplicateHandler.isProcessed(videoId)) {
    logger.info(`Video already processed: ${videoId}`);
    const existing = duplicateHandler.getExistingResult(videoId);
    return {
      video_id: videoId,
      url,
      status: 'skipped',
      reason: 'already_processed',
      previous_result: existing,
    };
  }

  try {
    // 3. Ambil metadata
    const metadata = await withRetry(
      () => getVideoMetadata(videoId),
      { label: `metadata:${videoId}`, maxRetries: 2 }
    );

    // 4. Coba ambil existing transcript
    let segments = [];
    let transcriptionSource = 'youtube_transcript';

    const existingTranscript = await getExistingTranscript(videoId);

    if (existingTranscript.available && existingTranscript.segments.length > 0) {
      logger.info(`Using existing YouTube transcript for ${videoId}`);
      segments = existingTranscript.segments;
      transcriptionSource = existingTranscript.source;
    } else {
      // 5. Fallback: Audio extraction → STT
      logger.info(`No existing transcript, using audio transcription for ${videoId}`);
      
      let audioPath = null;
      try {
        const audioResult = await withRetry(
          () => extractAudio(videoId),
          { label: `audio:${videoId}`, maxRetries: 2 }
        );
        audioPath = audioResult.audioPath;

        const sttResult = await withRetry(
          () => transcribeAudio(audioPath),
          { label: `stt:${videoId}`, maxRetries: 2 }
        );
        
        segments = sttResult.segments;
        transcriptionSource = 'speech_to_text';
      } finally {
        // Cleanup temp audio
        if (audioPath) {
          cleanupAudio(audioPath);
        }
      }
    }

    // 6. Language detection
    segments = detectSegmentLanguages(segments);
    const dominantLanguage = detectDominantLanguage(segments);

    // 7. Transcript cleaning
    segments = cleanTranscript(segments);

    // 8. Religious content detection
    segments = detectReligiousContent(segments);

    // 9. Religious content verification
    segments = await verifyReligiousContent(segments);

    // 10. Assemble final transcript
    const finalSegments = assembleTranscript(segments);

    // 11. Build result
    const result = {
      video_id: videoId,
      video_url: url,
      title: metadata.title,
      channel: metadata.channel,
      duration: metadata.duration,
      language: dominantLanguage,
      status: 'completed',
      transcription_source: transcriptionSource,
      processed_at: new Date().toISOString(),
      segments: finalSegments,
    };

    // 12. Save outputs
    await saveJSON(result, outputDir);
    await saveTXT(result, outputDir);

    // 13. Mark as processed
    if (duplicateHandler) {
      duplicateHandler.markProcessed(videoId, result);
    }

    logger.info(`Video ${videoId} processed successfully`);
    return result;

  } catch (error) {
    logger.error(`Processing failed for ${videoId}: ${error.message}`);
    
    const failedResult = {
      video_id: videoId,
      video_url: url,
      status: 'failed',
      error: error.message,
      processed_at: new Date().toISOString(),
    };

    return failedResult;
  }
}

/**
 * Proses batch video
 * @param {string[]} urls - Array of YouTube URLs
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} Batch processing results
 */
export async function processVideos(urls, options = {}) {
  const { outputDir = 'result' } = options;
  
  logger.info(`Starting batch processing: ${urls.length} URLs`);

  // Validasi semua URL
  const { valid, invalid } = validateBatchUrls(urls);

  // Setup duplicate handler
  const duplicateHandler = new DuplicateHandler(outputDir);

  // Deduplicate
  const { toProcess, duplicates, alreadyProcessed } = duplicateHandler.deduplicate(valid);

  // Inisialisasi CSV
  await initCSV(outputDir);

  // Setup queue
  const queue = new ProcessingQueue(1);

  // Proses semua video
  const results = await queue.processAll(toProcess, async (item) => {
    const result = await processVideo(item.url, { outputDir, duplicateHandler });
    
    // Append ke CSV
    await appendCSV(result, outputDir);
    
    return result;
  });

  // Tambahkan invalid URLs ke hasil
  for (const inv of invalid) {
    const failedResult = {
      url: inv.url,
      status: 'failed',
      error: inv.error,
    };
    results.push(failedResult);
    await appendCSV(failedResult, outputDir);
  }

  // Tambahkan duplicates ke hasil
  for (const dup of duplicates) {
    results.push({
      video_id: dup.videoId,
      url: dup.url,
      status: 'skipped',
      reason: 'duplicate_in_batch',
    });
  }

  // Tambahkan already processed ke hasil
  for (const ap of alreadyProcessed) {
    results.push({
      video_id: ap.videoId,
      url: ap.url,
      status: 'skipped',
      reason: 'already_processed',
    });
  }

  // Summary
  const summary = {
    total: urls.length,
    completed: results.filter(r => r.status === 'completed').length,
    failed: results.filter(r => r.status === 'failed').length,
    skipped: results.filter(r => r.status === 'skipped').length,
  };

  logger.info('Batch processing complete', summary);

  return {
    summary,
    results,
  };
}

export default { processVideo, processVideos };
