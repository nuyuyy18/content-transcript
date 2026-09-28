/**
 * JSON Output Module
 * Menyimpan hasil transcript dalam format JSON terstruktur
 * 
 * Output path: {outputDir}/json/{videoId}.json
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import logger from '../utils/logger.js';

/**
 * Simpan hasil transcript sebagai JSON
 * @param {Object} result - Processing result
 * @param {string} outputDir - Output directory
 */
export async function saveJSON(result, outputDir = 'result') {
  const jsonDir = join(outputDir, 'json');
  
  if (!existsSync(jsonDir)) {
    mkdirSync(jsonDir, { recursive: true });
  }

  const videoId = result.video_id;
  if (!videoId) {
    logger.warn('Cannot save JSON: no video_id');
    return;
  }

  const filePath = join(jsonDir, `${videoId}.json`);

  try {
    const jsonContent = JSON.stringify(result, null, 2);
    writeFileSync(filePath, jsonContent, 'utf-8');
    logger.info(`JSON saved: ${filePath}`);
  } catch (error) {
    logger.error(`Failed to save JSON: ${error.message}`);
    throw error;
  }
}

export default { saveJSON };
