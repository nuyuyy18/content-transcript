/**
 * PDF Output Module
 * Mengonversi dan merender hasil transkrip menjadi dokumen PDF berkualitas tinggi
 * dengan dukungan tipografi Arab berharakat (tashkeel), timestamp, dan kategori teks agama.
 * 
 * Output path: {outputDir}/{filename}.pdf
 */

import { writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join, resolve } from 'path';
import { execSync } from 'child_process';
import logger from '../utils/logger.js';

/**
 * Deteksi path browser headless (Edge / Chrome) di sistem operasi Windows
 * @returns {string|null}
 */
function getBrowserExecutablePath() {
  const possiblePaths = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];

  for (const p of possiblePaths) {
    if (existsSync(p)) {
      return p;
    }
  }

  return null;
}

/**
 * Format detik menjadi [HH:MM:SS]
 * @param {number} seconds
 * @returns {string}
 */
function formatTimestamp(seconds) {
  if (seconds == null || isNaN(seconds)) return '[--:--:--]';
  
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Escape karakter HTML
 * @param {string} str 
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Format teks segment dengan isolasi dua arah (BiDi) untuk teks Arab
 * @param {string} txt 
 * @returns {string}
 */
function formatSegmentText(txt) {
  if (!txt) return '';
  const trimmed = txt.trim();

  // Jika seluruh baris adalah teks Arab murni
  if (/^[\u0600-\u06FF\s\.,«»"'\(\)؟!]+$/.test(trimmed)) {
    return `<div class="arabic-standalone"><bdi dir="rtl" class="arabic-text">${escapeHtml(trimmed)}</bdi></div>`;
  }

  // Teks campuran (Indonesia/Arab): isolasi bagian Arab dengan <bdi>
  const arabicRegex = /([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s\.\u060C\u061B\u061F]+)/g;
  let formatted = '';
  let lastIndex = 0;
  let match;

  while ((match = arabicRegex.exec(txt)) !== null) {
    const rawMatch = match[0];
    if (/[\u0600-\u06FF]/.test(rawMatch)) {
      formatted += escapeHtml(txt.substring(lastIndex, match.index));
      formatted += `<bdi dir="rtl" class="arabic-text">${escapeHtml(rawMatch.trim())}</bdi> `;
      lastIndex = match.index + rawMatch.length;
    }
  }
  formatted += escapeHtml(txt.substring(lastIndex));
  return formatted || escapeHtml(txt);
}

/**
 * Menghasilkan HTML yang dioptimalkan untuk cetak A4 dan rendering PDF
 * @param {Object} result 
 * @param {string} themeTitle 
 * @returns {string}
 */
function generateHtmlTemplate(result, themeTitle) {
  const title = result.title || 'Transkrip Video';
  const url = result.video_url || result.url || 'N/A';
  const channel = result.channel || 'Unknown Channel';
  const language = (result.language || 'id').toUpperCase();
  const source = result.transcription_source || 'unknown';
  const theme = themeTitle || 'Jaminan Rezeki';

  let segmentsHtml = '';
  if (result.segments && result.segments.length > 0) {
    for (const segment of result.segments) {
      const timeStr = typeof segment.start === 'number' 
        ? formatTimestamp(segment.start)
        : (segment.time || '00:00:00');

      let hlClass = '';
      let tagLabel = '';

      if (segment.type === 'quran') {
        hlClass = 'highlight-quran';
        tagLabel = '<span class="tag tag-quran">Quran</span>';
      } else if (segment.type === 'hadith') {
        hlClass = 'highlight-hadith';
        tagLabel = '<span class="tag tag-hadith">Hadith</span>';
      } else if (segment.type === 'doa' || segment.type === 'dzikir') {
        hlClass = 'highlight-doa';
        tagLabel = '<span class="tag tag-doa">Doa</span>';
      } else if (segment.type === 'arabic_text') {
        tagLabel = '<span class="tag tag-ar">AR</span>';
      }

      const verifHtml = segment.verification_status === 'verified'
        ? `<span class="verif-badge" title="Verified">✓</span>`
        : '';

      const bodyHtml = formatSegmentText(segment.text);

      segmentsHtml += `
        <div class="segment ${hlClass}">
          <div class="segment-sidebar">
            <span class="timestamp">${escapeHtml(timeStr)}</span>
            ${tagLabel}
            ${verifHtml}
          </div>
          <div class="segment-content">
            ${bodyHtml}
          </div>
        </div>
      `;
    }
  } else {
    segmentsHtml = '<div class="no-content">(Tidak ada segmen transkrip tersedia)</div>';
  }

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)} - Transkrip PDF</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap');

    @page {
      size: A4;
      margin: 12mm 14mm 14mm 14mm;
      @bottom-right {
        content: "Halaman " counter(page);
        font-family: 'Inter', sans-serif;
        font-size: 8pt;
        color: #94a3b8;
      }
      @bottom-left {
        content: "Tema: ${escapeHtml(theme)} • ${escapeHtml(title)}";
        font-family: 'Inter', sans-serif;
        font-size: 7.5pt;
        color: #94a3b8;
      }
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 0;
      color: #1e293b;
      line-height: 1.45;
      font-size: 9pt;
      background: #ffffff;
    }

    .header-card {
      border: 1px solid #0f172a;
      background: linear-gradient(135deg, #090d16 0%, #1e293b 100%);
      color: #ffffff;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 14px;
    }

    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .badge-theme {
      background: #2563eb;
      color: #ffffff;
      font-size: 7.5pt;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      padding: 3px 8px;
      border-radius: 4px;
    }

    .doc-type {
      font-size: 7.5pt;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }

    .title {
      font-size: 13.5pt;
      font-weight: 700;
      line-height: 1.25;
      margin: 0 0 10px 0;
      color: #f8fafc;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: 2fr 1fr 1.5fr;
      gap: 4px 12px;
      font-size: 8pt;
      color: #cbd5e1;
      border-top: 1px solid rgba(255, 255, 255, 0.12);
      padding-top: 8px;
    }

    .meta-item strong {
      color: #94a3b8;
      font-weight: 500;
    }

    .meta-item a {
      color: #60a5fa;
      text-decoration: none;
    }

    .transcript-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .segment {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 5px 8px;
      border-radius: 5px;
      border: 1px solid #f1f5f9;
      background: #ffffff;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .segment:nth-child(even) {
      background: #f8fafc;
    }

    .segment.highlight-quran {
      background: #f0fdf4;
      border-color: #bbf7d0;
    }

    .segment.highlight-hadith {
      background: #fefce8;
      border-color: #fef08a;
    }

    .segment.highlight-doa {
      background: #faf5ff;
      border-color: #e9d5ff;
    }

    .segment-sidebar {
      flex-shrink: 0;
      width: 90px;
      display: flex;
      align-items: center;
      gap: 4px;
      padding-top: 1px;
    }

    .timestamp {
      font-family: 'JetBrains Mono', monospace;
      font-size: 7.5pt;
      font-weight: 600;
      color: #334155;
      background: #e2e8f0;
      padding: 2px 4px;
      border-radius: 3px;
      display: inline-block;
    }

    .tag {
      font-size: 6.5pt;
      font-weight: 700;
      padding: 1.5px 4px;
      border-radius: 3px;
      text-transform: uppercase;
      letter-spacing: 0.2px;
    }

    .tag-ar { background: #fef3c7; color: #92400e; }
    .tag-quran { background: #dcfce7; color: #166534; }
    .tag-hadith { background: #fef9c3; color: #854d0e; }
    .tag-doa { background: #f3e8ff; color: #6b21a8; }

    .verif-badge {
      font-size: 6.5pt;
      color: #16a34a;
      font-weight: 700;
      margin-left: 2px;
    }

    .segment-content {
      flex: 1;
      font-size: 8.8pt;
      color: #1e293b;
      line-height: 1.45;
    }

    .arabic-text {
      font-family: 'Amiri', 'Traditional Arabic', serif;
      font-size: 12.5pt;
      line-height: 1.6;
      color: #047857;
      font-weight: 700;
      display: inline;
      padding: 0 2px;
    }

    .arabic-standalone {
      background: #ecfdf5;
      border-right: 3px solid #10b981;
      padding: 3px 10px;
      border-radius: 4px;
      margin: 2px 0;
      text-align: right;
    }

    .footer-note {
      margin-top: 16px;
      padding-top: 8px;
      border-top: 1px solid #e2e8f0;
      font-size: 7.5pt;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header-card">
    <div class="header-top">
      <div class="badge-theme">Tema: ${escapeHtml(theme)}</div>
      <div class="doc-type">Dokumen Transkrip Resmi</div>
    </div>
    <h1 class="title">${escapeHtml(title)}</h1>
    <div class="meta-grid">
      <div class="meta-item"><strong>Channel:</strong> ${escapeHtml(channel)}</div>
      <div class="meta-item"><strong>Bahasa:</strong> ${escapeHtml(language)}</div>
      <div class="meta-item"><strong>Sumber:</strong> ${escapeHtml(source)}</div>
      <div class="meta-item" style="grid-column: span 3; margin-top: 2px;">
        <strong>URL Video:</strong> <a href="${escapeHtml(url)}">${escapeHtml(url)}</a>
      </div>
    </div>
  </div>

  <div class="transcript-list">
    ${segmentsHtml}
  </div>

  <div class="footer-note">
    Transkrip YouTube — Selesai diproses dengan akurasi teks ayat Al-Qur'an, Hadits, &amp; kutipan Arab berharakat.
  </div>
</body>
</html>
`;
}

/**
 * Simpan hasil transcript sebagai PDF
 * @param {Object} result - Processing result
 * @param {string} outputDir - Output directory
 * @param {Object} options - Options { themeName, filename }
 * @returns {Promise<string>} Path to generated PDF
 */
export async function savePDF(result, outputDir = 'result', options = {}) {
  const pdfDir = outputDir;

  if (!existsSync(pdfDir)) {
    mkdirSync(pdfDir, { recursive: true });
  }

  // Tentukan nama file: jika disediakan opsi, gunakan opsi; jika mengandung kata rezeki -> Jaminan Rezeki; default: videoId
  let baseName = options.filename;
  if (!baseName) {
    if (result.title && /rezeki/i.test(result.title)) {
      baseName = 'Jaminan Rezeki';
    } else {
      baseName = result.video_id || 'transcript';
    }
  }

  const pdfPath = join(pdfDir, `${baseName}.pdf`);
  const themeName = options.themeName || (baseName === 'Jaminan Rezeki' ? 'Jaminan Rezeki' : 'Kajian Keagamaan');

  const browserPath = getBrowserExecutablePath();
  if (!browserPath) {
    logger.warn('Browser headless (Edge / Chrome) tidak ditemukan. Melewatkan generasi PDF.');
    return null;
  }

  // Tulis temporary HTML
  const tempHtmlPath = join(pdfDir, `.${baseName}.temp.html`);
  const htmlContent = generateHtmlTemplate(result, themeName);
  writeFileSync(tempHtmlPath, htmlContent, 'utf-8');

  try {
    const cmd = `"${browserPath}" --headless --disable-gpu --run-all-compositor-stages-before-draw --no-pdf-header-footer --print-to-pdf="${resolve(pdfPath)}" "${resolve(tempHtmlPath)}"`;
    execSync(cmd, { stdio: 'pipe' });
    logger.info(`PDF saved successfully: ${pdfPath}`);
    return pdfPath;
  } catch (error) {
    logger.error(`Gagal membuat PDF untuk ${baseName}: ${error.message}`);
    throw error;
  } finally {
    // Hapus temporary HTML
    if (existsSync(tempHtmlPath)) {
      try {
        unlinkSync(tempHtmlPath);
      } catch (e) {
        // ignore cleanup error
      }
    }
  }
}

export default { savePDF };
