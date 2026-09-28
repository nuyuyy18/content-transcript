/**
 * YouTube Video Metadata Extractor
 * Mengambil metadata dasar video YouTube:
 *   - Video ID, URL, Title, Channel, Duration, Published Date
 */

import logger from '../utils/logger.js';

/**
 * Mengambil metadata video dari YouTube menggunakan oEmbed API (no key required)
 * dan ytdl-core sebagai fallback
 * 
 * @param {string} videoId - YouTube Video ID
 * @returns {Promise<Object>} Video metadata
 */
export async function getVideoMetadata(videoId) {
  logger.info(`Fetching metadata for video: ${videoId}`);
  
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  
  try {
    // Coba oEmbed API dulu (gratis, tanpa API key)
    const metadata = await fetchOEmbedMetadata(videoId, videoUrl);
    logger.info(`Metadata retrieved for: ${metadata.title}`);
    return metadata;
  } catch (oembedError) {
    logger.warn(`oEmbed failed for ${videoId}: ${oembedError.message}`);
    
    try {
      // Fallback ke ytdl-core
      const metadata = await fetchYtdlMetadata(videoId, videoUrl);
      logger.info(`Metadata retrieved via ytdl-core for: ${metadata.title}`);
      return metadata;
    } catch (ytdlError) {
      logger.error(`All metadata methods failed for ${videoId}: ${ytdlError.message}`);
      
      // Return minimal metadata agar proses tetap jalan
      return {
        video_id: videoId,
        video_url: videoUrl,
        title: `Video ${videoId}`,
        channel: 'Unknown',
        duration: 0,
        published_date: null,
        metadata_source: 'fallback',
      };
    }
  }
}

/**
 * Fetch metadata menggunakan YouTube oEmbed API
 */
async function fetchOEmbedMetadata(videoId, videoUrl) {
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
  
  const response = await fetch(oembedUrl);
  
  if (!response.ok) {
    throw new Error(`oEmbed API returned ${response.status}`);
  }
  
  const data = await response.json();
  
  return {
    video_id: videoId,
    video_url: videoUrl,
    title: data.title || `Video ${videoId}`,
    channel: data.author_name || 'Unknown',
    duration: 0, // oEmbed tidak menyediakan duration
    published_date: null,
    metadata_source: 'oembed',
  };
}

/**
 * Fetch metadata menggunakan ytdl-core
 */
async function fetchYtdlMetadata(videoId, videoUrl) {
  try {
    const ytdl = await import('ytdl-core');
    const info = await ytdl.default.getInfo(videoUrl);
    const details = info.videoDetails;
    
    return {
      video_id: videoId,
      video_url: videoUrl,
      title: details.title || `Video ${videoId}`,
      channel: details.author?.name || details.ownerChannelName || 'Unknown',
      duration: parseInt(details.lengthSeconds) || 0,
      published_date: details.publishDate || null,
      metadata_source: 'ytdl-core',
    };
  } catch (err) {
    throw new Error(`ytdl-core failed: ${err.message}`);
  }
}

export default { getVideoMetadata };
