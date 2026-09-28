/**
 * Retry Mechanism
 * Menangani retry untuk error sementara
 * 
 * MAX_RETRIES = 3 (default)
 * Error permanen tidak di-retry
 */

import logger from '../utils/logger.js';

/**
 * Error yang bersifat permanen dan tidak perlu di-retry
 */
const PERMANENT_ERRORS = [
  'Invalid YouTube video URL',
  'Video is unavailable',
  'Video is private',
  'Video unavailable',
  'Invalid URL',
  'not configured',
];

/**
 * Cek apakah error bersifat permanen
 * @param {Error} error
 * @returns {boolean}
 */
function isPermanentError(error) {
  const message = error.message || '';
  return PERMANENT_ERRORS.some(pe => message.includes(pe));
}

/**
 * Jalankan fungsi dengan retry mechanism
 * @param {Function} fn - Async function untuk dijalankan
 * @param {Object} options - Opsi retry
 * @param {number} [options.maxRetries=3] - Maksimum retry
 * @param {number} [options.delayMs=1000] - Delay awal antar retry (ms)
 * @param {number} [options.backoffMultiplier=2] - Multiplier untuk exponential backoff
 * @param {string} [options.label='operation'] - Label untuk logging
 * @returns {Promise<*>} Hasil dari fn
 */
export async function withRetry(fn, options = {}) {
  const {
    maxRetries = parseInt(process.env.MAX_RETRIES) || 3,
    delayMs = 1000,
    backoffMultiplier = 2,
    label = 'operation',
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      lastError = error;

      // Jangan retry error permanen
      if (isPermanentError(error)) {
        logger.error(`Permanent error for ${label}: ${error.message}`);
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = delayMs * Math.pow(backoffMultiplier, attempt - 1);
        logger.warn(`${label} attempt ${attempt}/${maxRetries} failed: ${error.message}. Retrying in ${delay}ms...`);
        await sleep(delay);
      } else {
        logger.error(`${label} failed after ${maxRetries} attempts: ${error.message}`);
      }
    }
  }

  throw lastError;
}

/**
 * Sleep helper
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default { withRetry };
