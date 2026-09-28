import { readFileSync } from 'fs';
import { resolve } from 'path';
import { savePDF } from '../src/output/pdf.js';

async function run() {
  const jsonPath = resolve('result/json/Jaminan Rezeki.json');
  const result = JSON.parse(readFileSync(jsonPath, 'utf8'));
  
  console.log(`Generating PDF using integrated system module src/output/pdf.js for: ${result.title}`);
  const pdfPath = await savePDF(result, 'result', { filename: 'Jaminan Rezeki', themeName: 'Jaminan Rezeki' });
  console.log('Generated PDF path:', pdfPath);
}

run().catch(err => {
  console.error('Error generating PDF:', err);
  process.exit(1);
});
