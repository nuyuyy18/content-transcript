/**
 * YouTube Content Transcription System
 * Entry Point / CLI
 * 
 * Usage:
 *   node src/index.js <url>                      # Single video
 *   node src/index.js <url1> <url2> <url3>       # Multiple videos
 *   node src/index.js --file input.csv            # From CSV file
 *   node src/index.js --file urls.txt             # From text file (one URL per line)
 * 
 * Options:
 *   --output <dir>    Output directory (default: result)
 *   --file <path>     Input file (CSV or TXT with URLs)
 *   --help            Show help
 */

import { config } from 'dotenv';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { processVideo, processVideos } from './processing/processor.js';
import logger from './utils/logger.js';

// Load environment variables
config();

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const parsed = {
    urls: [],
    file: null,
    outputDir: process.env.OUTPUT_DIR || 'result',
    help: false,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else if (arg === '--file' || arg === '-f') {
      i++;
      parsed.file = args[i];
    } else if (arg === '--output' || arg === '-o') {
      i++;
      parsed.outputDir = args[i];
    } else if (!arg.startsWith('--')) {
      parsed.urls.push(arg);
    }

    i++;
  }

  return parsed;
}

/**
 * Baca URLs dari file (CSV atau TXT)
 */
function readUrlsFromFile(filePath) {
  const absPath = resolve(filePath);
  
  if (!existsSync(absPath)) {
    throw new Error(`Input file not found: ${absPath}`);
  }

  const content = readFileSync(absPath, 'utf-8');
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // Deteksi apakah CSV (ada header "youtube_url" atau koma)
  if (lines[0] && (lines[0].toLowerCase().includes('youtube_url') || lines[0].includes(','))) {
    // CSV mode
    const urls = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      const url = parts[0].trim().replace(/^["']|["']$/g, '');
      if (url) urls.push(url);
    }
    return urls;
  }

  // Plain text mode (one URL per line)
  return lines.filter(line => line.startsWith('http'));
}

/**
 * Show help
 */
function showHelp() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║     YouTube Content Transcription System v1.0               ║
║     Transkripsi video YouTube dengan verifikasi agama       ║
╚══════════════════════════════════════════════════════════════╝

Usage:
  node src/index.js <url>                     Proses satu video
  node src/index.js <url1> <url2> ...         Proses banyak video
  node src/index.js --file input.csv          Proses dari file CSV
  node src/index.js --file urls.txt           Proses dari file teks

Options:
  -f, --file <path>     File input (CSV atau TXT)
  -o, --output <dir>    Direktori output (default: result)
  -h, --help            Tampilkan bantuan

Output:
  result/
  ├── transcripts/      File .txt (human-readable)
  ├── json/             File .json (machine-readable)
  └── results.csv       Ringkasan batch

Environment Variables (.env):
  OPENAI_API_KEY        API key OpenAI (untuk Whisper STT)
  MAX_RETRIES           Maks retry per video (default: 3)
  OUTPUT_DIR            Direktori output (default: result)

Examples:
  node src/index.js https://www.youtube.com/watch?v=abc123
  node src/index.js --file videos.csv --output hasil
  `);
}

/**
 * Main entry point
 */
async function main() {
  const args = parseArgs(process.argv.slice(2));

  // Show help
  if (args.help) {
    showHelp();
    process.exit(0);
  }

  // Kumpulkan URLs
  let urls = [...args.urls];

  // Baca dari file jika ada
  if (args.file) {
    try {
      const fileUrls = readUrlsFromFile(args.file);
      urls = urls.concat(fileUrls);
      logger.info(`Loaded ${fileUrls.length} URLs from ${args.file}`);
    } catch (error) {
      logger.error(`Failed to read input file: ${error.message}`);
      process.exit(1);
    }
  }

  // Validasi ada URL
  if (urls.length === 0) {
    console.log('\n  ⚠ Tidak ada URL yang diberikan.\n');
    showHelp();
    process.exit(1);
  }

  // Output directory
  const outputDir = resolve(args.outputDir);
  logger.info(`Output directory: ${outputDir}`);

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     YouTube Content Transcription System                    ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  const startTime = Date.now();

  try {
    if (urls.length === 1) {
      // Single video
      logger.info(`Processing single video: ${urls[0]}`);
      const result = await processVideo(urls[0], { outputDir });
      
      console.log('');
      if (result.status === 'completed') {
        console.log(`  ✅ Transkripsi berhasil: ${result.title}`);
        console.log(`     TXT: ${outputDir}/transcripts/${result.video_id}.txt`);
        console.log(`     JSON: ${outputDir}/json/${result.video_id}.json`);
        console.log(`     PDF: ${outputDir}/transcripts/${result.title && /rezeki/i.test(result.title) ? 'Jaminan Rezeki' : result.video_id}.pdf`);
      } else {
        console.log(`  ❌ Gagal: ${result.error}`);
      }
    } else {
      // Batch processing
      logger.info(`Processing batch: ${urls.length} videos`);
      const { summary, results } = await processVideos(urls, { outputDir });

      console.log('');
      console.log('  ╔════════════════════════════════════╗');
      console.log('  ║        BATCH PROCESSING SUMMARY    ║');
      console.log('  ╠════════════════════════════════════╣');
      console.log(`  ║  Total:     ${String(summary.total).padStart(5)}                 ║`);
      console.log(`  ║  Completed: ${String(summary.completed).padStart(5)}  ✅             ║`);
      console.log(`  ║  Failed:    ${String(summary.failed).padStart(5)}  ❌             ║`);
      console.log(`  ║  Skipped:   ${String(summary.skipped).padStart(5)}  ⏭              ║`);
      console.log('  ╚════════════════════════════════════╝');
      console.log('');
      console.log(`  📁 Results: ${outputDir}/results.csv`);
    }
  } catch (error) {
    logger.error(`Fatal error: ${error.message}`);
    console.error(`\n  ❌ Fatal error: ${error.message}\n`);
    process.exit(1);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n  ⏱ Total waktu: ${elapsed}s\n`);
}

// Run
main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
