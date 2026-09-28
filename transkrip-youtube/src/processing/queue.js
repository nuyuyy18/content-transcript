/**
 * Queue Manager
 * Mengelola antrian pemrosesan video
 * Mendukung concurrency control
 */

import logger from '../utils/logger.js';

/**
 * Simple queue dengan concurrency control
 */
class ProcessingQueue {
  constructor(concurrencyLimit = 1) {
    this.concurrencyLimit = concurrencyLimit;
    this.queue = [];
    this.running = 0;
    this.results = [];
    this.completed = 0;
    this.failed = 0;
    this.total = 0;
  }

  /**
   * Tambahkan items ke queue
   * @param {Array} items - Items untuk diproses
   * @param {Function} processor - Async function untuk memproses setiap item
   * @returns {Promise<Array>} Semua hasil
   */
  async processAll(items, processor) {
    this.total = items.length;
    this.completed = 0;
    this.failed = 0;
    this.results = [];

    logger.info(`Queue started: ${this.total} items, concurrency: ${this.concurrencyLimit}`);

    // Untuk versi pertama, proses secara sequential (concurrency = 1)
    // Ini lebih aman untuk API rate limits
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      try {
        const result = await processor(item);
        this.results.push(result);
        this.completed++;
      } catch (error) {
        this.results.push({
          url: item.url || item,
          video_id: item.videoId || null,
          status: 'failed',
          error: error.message,
        });
        this.failed++;
      }

      // Log progress
      logger.progress(i + 1, this.total, this.completed, this.failed);
    }

    logger.info(`Queue completed: ${this.completed} succeeded, ${this.failed} failed`);
    return this.results;
  }

  /**
   * Get current stats
   */
  getStats() {
    return {
      total: this.total,
      completed: this.completed,
      failed: this.failed,
      remaining: this.total - this.completed - this.failed,
    };
  }
}

export default ProcessingQueue;
