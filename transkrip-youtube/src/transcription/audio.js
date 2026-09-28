/**
 * Audio Extractor
 * Mengekstrak audio dari video YouTube untuk keperluan STT
 * Menggunakan ytdl-core untuk download dan ffmpeg untuk konversi
 */

import { createWriteStream, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import logger from '../utils/logger.js';

const TEMP_DIR = join(process.cwd(), 'temp');

/**
 * Pastikan temp directory ada
 */
function ensureTempDir() {
  if (!existsSync(TEMP_DIR)) {
    mkdirSync(TEMP_DIR, { recursive: true });
  }
}

/**
 * Ekstrak audio dari YouTube video
 * @param {string} videoId - YouTube Video ID
 * @returns {Promise<{audioPath: string, format: string}>}
 */
export async function extractAudio(videoId) {
  logger.info(`Extracting audio for video: ${videoId}`);
  ensureTempDir();

  const outputPath = join(TEMP_DIR, `${videoId}.mp3`);

  // Jika sudah ada dari proses sebelumnya, langsung return
  if (existsSync(outputPath)) {
    logger.info(`Audio already exists: ${outputPath}`);
    return { audioPath: outputPath, format: 'mp3' };
  }

  try {
    const ytdl = await import('ytdl-core');
    
    return new Promise((resolve, reject) => {
      const stream = ytdl.default(
        `https://www.youtube.com/watch?v=${videoId}`,
        {
          filter: 'audioonly',
          quality: 'lowestaudio', // Kualitas rendah untuk ukuran kecil & proses cepat
        }
      );

      const writeStream = createWriteStream(outputPath);

      stream.pipe(writeStream);

      stream.on('error', (err) => {
        logger.error(`Audio extraction stream error: ${err.message}`);
        reject(new Error(`Unable to extract audio: ${err.message}`));
      });

      writeStream.on('finish', () => {
        logger.info(`Audio extracted: ${outputPath}`);
        resolve({ audioPath: outputPath, format: 'mp3' });
      });

      writeStream.on('error', (err) => {
        logger.error(`Audio write error: ${err.message}`);
        reject(new Error(`Unable to extract audio: ${err.message}`));
      });
    });

  } catch (error) {
    logger.error(`Audio extraction failed for ${videoId}: ${error.message}`);
    throw new Error(`Unable to extract audio: ${error.message}`);
  }
}

/**
 * Hapus temporary audio file
 * @param {string} audioPath - Path ke audio file
 */
export function cleanupAudio(audioPath) {
  try {
    if (existsSync(audioPath)) {
      unlinkSync(audioPath);
      logger.debug(`Temp audio deleted: ${audioPath}`);
    }
  } catch (error) {
    logger.warn(`Failed to delete temp audio: ${error.message}`);
  }
}

/**
 * Hapus semua temp files
 */
export function cleanupAllTemp() {
  try {
    if (existsSync(TEMP_DIR)) {
      const { readdirSync } = require('fs');
      const files = readdirSync(TEMP_DIR);
      for (const file of files) {
        unlinkSync(join(TEMP_DIR, file));
      }
      logger.info('All temp files cleaned up');
    }
  } catch (error) {
    logger.warn(`Temp cleanup failed: ${error.message}`);
  }
}

export default { extractAudio, cleanupAudio, cleanupAllTemp };
