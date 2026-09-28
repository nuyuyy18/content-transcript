/**
 * CSV Output Module
 * Menyimpan ringkasan hasil batch processing dalam format CSV
 * 
 * Output path: {outputDir}/results.csv
 * 
 * Kolom:
 *   video_id, title, url, channel, language, duration,
 *   transcription_source, status, transcript_file, error
 */

import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import logger from '../utils/logger.js';

const CSV_FILENAME = 'results.csv';

const CSV_HEADERS = [
  'video_id',
  'title',
  'url',
  'channel',
  'language',
  'duration',
  'transcription_source',
  'status',
  'transcript_file',
  'error',
];

/**
 * Escape CSV value
 * @param {*} value
 * @returns {string}
 */
function escapeCSV(value) {
  if (value == null) return '';
  const str = String(value);
  // Jika mengandung koma, newline, atau quote → wrap dengan double quotes
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Inisialisasi CSV file dengan header
 * @param {string} outputDir
 */
export async function initCSV(outputDir = 'result') {
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const filePath = join(outputDir, CSV_FILENAME);
  
  // Hanya tulis header jika file belum ada
  if (!existsSync(filePath)) {
    const header = CSV_HEADERS.join(',') + '\n';
    writeFileSync(filePath, header, 'utf-8');
    logger.info(`CSV initialized: ${filePath}`);
  }
}

/**
 * Append satu hasil ke CSV
 * @param {Object} result - Processing result
 * @param {string} outputDir
 */
export async function appendCSV(result, outputDir = 'result') {
  const filePath = join(outputDir, CSV_FILENAME);

  // Pastikan CSV sudah di-init
  if (!existsSync(filePath)) {
    await initCSV(outputDir);
  }

  const videoId = result.video_id || '';
  const transcriptFile = result.status === 'completed'
    ? `transcripts/${videoId}.txt`
    : '';

  const row = [
    escapeCSV(videoId),
    escapeCSV(result.title || ''),
    escapeCSV(result.video_url || result.url || ''),
    escapeCSV(result.channel || ''),
    escapeCSV(result.language || ''),
    escapeCSV(result.duration || ''),
    escapeCSV(result.transcription_source || ''),
    escapeCSV(result.status || ''),
    escapeCSV(transcriptFile),
    escapeCSV(result.error || ''),
  ].join(',') + '\n';

  try {
    appendFileSync(filePath, row, 'utf-8');
    logger.debug(`CSV row appended for: ${videoId || result.url}`);
  } catch (error) {
    logger.error(`Failed to append CSV: ${error.message}`);
  }
}

export default { initCSV, appendCSV };
