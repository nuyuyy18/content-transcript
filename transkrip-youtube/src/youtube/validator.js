/**
 * YouTube URL Validator
 * Memvalidasi URL YouTube dan mengekstrak Video ID
 * 
 * URL yang didukung:
 *   - https://www.youtube.com/watch?v=VIDEO_ID
 *   - https://youtu.be/VIDEO_ID
 *   - https://youtube.com/watch?v=VIDEO_ID
 *   - https://m.youtube.com/watch?v=VIDEO_ID
 * 
 * URL yang TIDAK didukung:
 *   - Channel URLs
 *   - Playlist URLs
 *   - Username URLs
 */

import logger from '../utils/logger.js';

/**
 * Regex patterns untuk YouTube video URL
 */
const YOUTUBE_PATTERNS = [
  // Standard: https://www.youtube.com/watch?v=VIDEO_ID
  /^(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})(?:&.*)?$/,
  // Short: https://youtu.be/VIDEO_ID
  /^(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})(?:\?.*)?$/,
  // Mobile: https://m.youtube.com/watch?v=VIDEO_ID
  /^(?:https?:\/\/)?m\.youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})(?:&.*)?$/,
  // Embed: https://www.youtube.com/embed/VIDEO_ID
  /^(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})(?:\?.*)?$/,
];

/**
 * Patterns yang secara eksplisit TIDAK didukung
 */
const UNSUPPORTED_PATTERNS = [
  /youtube\.com\/channel\//,
  /youtube\.com\/@/,
  /youtube\.com\/playlist/,
  /youtube\.com\/user\//,
];

/**
 * Validasi apakah URL merupakan YouTube video URL yang valid
 * @param {string} url - URL untuk divalidasi
 * @returns {{ valid: boolean, videoId?: string, error?: string }}
 */
export function validateYouTubeUrl(url) {
  if (!url || typeof url !== 'string') {
    logger.error('URL is empty or not a string');
    return {
      valid: false,
      error: 'URL is empty or not a valid string',
    };
  }

  const trimmedUrl = url.trim();

  // Cek apakah URL termasuk format yang tidak didukung
  for (const pattern of UNSUPPORTED_PATTERNS) {
    if (pattern.test(trimmedUrl)) {
      logger.warn(`Unsupported URL format: ${trimmedUrl}`);
      return {
        valid: false,
        error: 'Invalid YouTube video URL. Channel, playlist, and user URLs are not supported.',
      };
    }
  }

  // Cek apakah URL match dengan format yang didukung
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = trimmedUrl.match(pattern);
    if (match && match[1]) {
      const videoId = match[1];
      logger.info(`Valid YouTube URL detected, Video ID: ${videoId}`);
      return {
        valid: true,
        videoId,
      };
    }
  }

  logger.error(`Invalid YouTube video URL: ${trimmedUrl}`);
  return {
    valid: false,
    error: 'Invalid YouTube video URL',
  };
}

/**
 * Ekstrak Video ID dari URL YouTube
 * @param {string} url - YouTube URL
 * @returns {string|null} Video ID atau null jika tidak valid
 */
export function extractVideoId(url) {
  const result = validateYouTubeUrl(url);
  return result.valid ? result.videoId : null;
}

/**
 * Validasi batch URLs
 * @param {string[]} urls - Array of YouTube URLs
 * @returns {{ valid: Array, invalid: Array }}
 */
export function validateBatchUrls(urls) {
  const valid = [];
  const invalid = [];

  for (const url of urls) {
    const result = validateYouTubeUrl(url);
    if (result.valid) {
      valid.push({ url, videoId: result.videoId });
    } else {
      invalid.push({ url, error: result.error });
    }
  }

  logger.info(`Batch validation: ${valid.length} valid, ${invalid.length} invalid`);
  return { valid, invalid };
}

export default {
  validateYouTubeUrl,
  extractVideoId,
  validateBatchUrls,
};
