/**
 * Speech-to-Text Module
 * Mengkonversi audio menjadi teks menggunakan OpenAI Whisper API
 * 
 * Mendukung:
 *   - Bahasa Indonesia, Inggris, Arab
 *   - Mixed language
 *   - Ceramah, narasi, percakapan
 *   - Mempertahankan ucapan asli (tidak mengubah ke bahasa formal)
 */

import { createReadStream, statSync } from 'fs';
import logger from '../utils/logger.js';

// Whisper API max file size: 25 MB
const MAX_FILE_SIZE = 25 * 1024 * 1024;

/**
 * Transkripsi audio menggunakan OpenAI Whisper API
 * @param {string} audioPath - Path ke file audio
 * @param {string} [language] - Kode bahasa (opsional, auto-detect jika kosong)
 * @returns {Promise<{segments: Array, language: string, source: string}>}
 */
export async function transcribeAudio(audioPath, language = null) {
  logger.info(`Transcribing audio: ${audioPath}`);

  // Cek ukuran file
  const fileStats = statSync(audioPath);
  if (fileStats.size > MAX_FILE_SIZE) {
    logger.warn(`Audio file too large: ${(fileStats.size / 1024 / 1024).toFixed(1)} MB (max 25 MB)`);
    throw new Error('Audio file exceeds 25 MB limit. Consider splitting the audio.');
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.startsWith('sk-xxx')) {
    throw new Error(
      'OpenAI API key not configured. Set OPENAI_API_KEY in .env file.\n' +
      'Whisper API is required for audio transcription when YouTube transcript is not available.'
    );
  }

  try {
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey });

    const audioStream = createReadStream(audioPath);

    // Request options
    const requestOptions = {
      file: audioStream,
      model: 'whisper-1',
      response_format: 'verbose_json', // Untuk mendapatkan timestamps
      timestamp_granularities: ['segment'],
    };

    // Jika bahasa diketahui, set secara eksplisit untuk akurasi yang lebih baik
    if (language && language !== 'unknown') {
      requestOptions.language = language;
    }

    logger.info('Sending audio to Whisper API...');
    const response = await openai.audio.transcriptions.create(requestOptions);

    // Parse response menjadi segments dengan timestamps
    const segments = parseWhisperResponse(response);

    logger.info(`Transcription complete: ${segments.length} segments`);

    return {
      segments,
      language: response.language || language || 'unknown',
      source: 'speech_to_text',
    };

  } catch (error) {
    if (error.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    logger.error(`Speech-to-text failed: ${error.message}`);
    throw new Error(`Transcription service failed: ${error.message}`);
  }
}

/**
 * Parse Whisper API response menjadi segment format standar
 * @param {Object} response - Whisper API response
 * @returns {Array} Parsed segments
 */
function parseWhisperResponse(response) {
  const segments = [];

  if (response.segments && Array.isArray(response.segments)) {
    for (const seg of response.segments) {
      segments.push({
        start: seg.start || 0,
        end: seg.end || 0,
        text: (seg.text || '').trim(),
        language: response.language || 'unknown',
        confidence: seg.avg_logprob
          ? Math.exp(seg.avg_logprob) // Convert log prob ke probability
          : null,
      });
    }
  } else if (response.text) {
    // Fallback: tidak ada segment detail
    segments.push({
      start: 0,
      end: 0,
      text: response.text.trim(),
      language: response.language || 'unknown',
      confidence: null,
    });
  }

  return segments;
}

export default { transcribeAudio };
