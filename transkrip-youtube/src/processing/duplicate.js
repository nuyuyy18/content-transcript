/**
 * Duplicate Handler
 * Menghindari pemrosesan ulang video yang sama
 * Video ID sebagai identifier utama
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import logger from '../utils/logger.js';

const PROCESSED_FILE = 'processed_videos.json';

/**
 * Class untuk mengelola tracking video yang sudah diproses
 */
class DuplicateHandler {
  constructor(outputDir) {
    this.outputDir = outputDir;
    this.filePath = join(outputDir, PROCESSED_FILE);
    this.processed = this._load();
  }

  /**
   * Load daftar video yang sudah diproses
   */
  _load() {
    try {
      if (existsSync(this.filePath)) {
        const data = readFileSync(this.filePath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      logger.warn(`Failed to load processed list: ${error.message}`);
    }
    return {};
  }

  /**
   * Save daftar video yang sudah diproses
   */
  _save() {
    try {
      if (!existsSync(this.outputDir)) {
        mkdirSync(this.outputDir, { recursive: true });
      }
      writeFileSync(this.filePath, JSON.stringify(this.processed, null, 2), 'utf-8');
    } catch (error) {
      logger.error(`Failed to save processed list: ${error.message}`);
    }
  }

  /**
   * Cek apakah video sudah pernah diproses
   * @param {string} videoId
   * @returns {boolean}
   */
  isProcessed(videoId) {
    return !!this.processed[videoId];
  }

  /**
   * Dapatkan hasil existing jika sudah diproses
   * @param {string} videoId
   * @returns {Object|null}
   */
  getExistingResult(videoId) {
    return this.processed[videoId] || null;
  }

  /**
   * Tandai video sebagai sudah diproses
   * @param {string} videoId
   * @param {Object} result - Hasil pemrosesan
   */
  markProcessed(videoId, result) {
    this.processed[videoId] = {
      video_id: videoId,
      status: result.status || 'completed',
      processed_at: new Date().toISOString(),
      title: result.title || null,
    };
    this._save();
    logger.debug(`Marked as processed: ${videoId}`);
  }

  /**
   * Deduplicate array of URLs
   * @param {Array} urlsWithIds - Array of {url, videoId}
   * @returns {{ toProcess: Array, duplicates: Array, alreadyProcessed: Array }}
   */
  deduplicate(urlsWithIds) {
    const seen = new Set();
    const toProcess = [];
    const duplicates = [];
    const alreadyProcessed = [];

    for (const item of urlsWithIds) {
      if (this.isProcessed(item.videoId)) {
        alreadyProcessed.push(item);
        logger.info(`Already processed: ${item.videoId}`);
      } else if (seen.has(item.videoId)) {
        duplicates.push(item);
        logger.info(`Duplicate in batch: ${item.videoId}`);
      } else {
        seen.add(item.videoId);
        toProcess.push(item);
      }
    }

    logger.info(`Dedup: ${toProcess.length} to process, ${duplicates.length} duplicates, ${alreadyProcessed.length} already done`);
    return { toProcess, duplicates, alreadyProcessed };
  }
}

export default DuplicateHandler;
