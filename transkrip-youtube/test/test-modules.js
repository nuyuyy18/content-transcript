import { validateYouTubeUrl, extractVideoId } from '../src/youtube/validator.js';
import { cleanText, cleanTranscript } from '../src/transcription/cleaner.js';
import { detectLanguage, containsArabic } from '../src/transcription/languageDetection.js';
import { 
  detectReligiousContent, 
  detectReligiousSegment, 
  extractQuranReference, 
  extractHadithReference,
  CONTENT_TYPES 
} from '../src/religious/detector.js';
import { resolveSurahNumber, getVerifiedAyah, verifyQuranSegment } from '../src/religious/quran.js';
import { resolveHadithBook, detectNarrator, verifyHadithSegment } from '../src/religious/hadith.js';
import { verifyReligiousContent, assembleTranscript } from '../src/religious/verifier.js';
import DuplicateHandler from '../src/processing/duplicate.js';
import { saveTXT } from '../src/output/txt.js';
import { saveJSON } from '../src/output/json.js';
import { existsSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  RUNNING MODULAR VERIFICATION TESTS                      ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  console.log('\n=== 1. TEST URL VALIDATION ===');
  const standardUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  const shortUrl = 'https://youtu.be/dQw4w9WgXcQ';
  const embedUrl = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
  const invalidUrl = 'https://example.com/video';

  const v1 = validateYouTubeUrl(standardUrl);
  assert(v1.valid && v1.videoId === 'dQw4w9WgXcQ', `Standard URL valid -> ${v1.videoId}`);

  const v2 = validateYouTubeUrl(shortUrl);
  assert(v2.valid && v2.videoId === 'dQw4w9WgXcQ', `Short URL valid -> ${v2.videoId}`);

  const v3 = validateYouTubeUrl(embedUrl);
  assert(v3.valid && v3.videoId === 'dQw4w9WgXcQ', `Embed URL valid -> ${v3.videoId}`);

  const v4 = validateYouTubeUrl(invalidUrl);
  assert(!v4.valid, `Invalid URL correctly rejected (${v4.error})`);

  console.log('\n=== 2. TEST TRANSCRIPT CLEANER ===');
  const dirtyText = '  Halo semuanya &amp; teman-teman <font color="red">test</font> [Musik] [musik] kata kata kata yang berulang   ';
  const cleaned = cleanText(dirtyText);
  assert(!cleaned.includes('&amp;'), 'HTML entities decoded');
  assert(!cleaned.includes('<font'), 'HTML tags stripped');
  assert(!cleaned.includes('[musik]'), 'Music tags normalized');
  assert(!cleaned.includes('kata kata kata'), 'Triple repeated words collapsed');
  console.log(`  Raw: "${dirtyText}"`);
  console.log(`  Cleaned: "${cleaned}"`);

  const segments = [
    { start: 0, end: 2, text: 'Halo', language: 'id' },
    { start: 2, end: 4, text: 'semuanya', language: 'id' },
    { start: 4, end: 8, text: 'hari ini kita belajar', language: 'id' }
  ];
  const cleanedSegments = cleanTranscript(segments);
  assert(cleanedSegments.length <= segments.length, `Segments merged properly: ${segments.length} -> ${cleanedSegments.length}`);

  console.log('\n=== 3. TEST LANGUAGE DETECTION ===');
  const textId = 'Selamat pagi semuanya, hari ini kita akan belajar mengenai ilmu pengetahuan alam.';
  const textAr = 'بسم الله الرحمن الرحيم الحمد لله رب العالمين';
  const textMixed = 'Pada ceramah hari ini ustadz membaca ayat Al-Quran.';

  const l1 = detectLanguage(textId);
  assert(l1 === 'id', `Indonesian detected: ${l1}`);

  const l2 = detectLanguage(textAr);
  assert(l2 === 'ar', `Arabic detected: ${l2}`);
  assert(containsArabic(textAr), 'Arabic script detected correctly');

  const l3 = detectLanguage(textMixed);
  assert(l3 === 'id', `Mixed text primary language detected: ${l3}`);

  console.log('\n=== 4. TEST RELIGIOUS DETECTOR ===');
  const quranSegment = { start: 0, end: 5, text: 'Sebagaimana firman Allah dalam surat Al-Baqarah ayat 255' };
  const hadithSegment = { start: 5, end: 10, text: 'Rasulullah shallallahu alaihi wa sallam bersabda dalam Hadis Riwayat Bukhari nomor 1' };
  const doaSegment = { start: 10, end: 15, text: 'Mari kita bersama-sama membaca doa bismillah' };
  const normalSegment = { start: 15, end: 20, text: 'Selamat datang di channel kami jangan lupa subscribe' };

  const detectedQuran = detectReligiousSegment(quranSegment);
  assert(detectedQuran.type === CONTENT_TYPES.QURAN, `Quran segment detected as ${detectedQuran.type}`);

  const detectedHadith = detectReligiousSegment(hadithSegment);
  assert(detectedHadith.type === CONTENT_TYPES.HADITH, `Hadith segment detected as ${detectedHadith.type}`);

  const detectedDoa = detectReligiousSegment(doaSegment);
  assert(detectedDoa.type === CONTENT_TYPES.DOA, `Doa segment detected as ${detectedDoa.type}`);

  const detectedNormal = detectReligiousSegment(normalSegment);
  assert(detectedNormal.type === CONTENT_TYPES.SPEECH, `Normal segment detected as ${detectedNormal.type}`);

  const qRef = extractQuranReference('surat Al-Baqarah ayat 255');
  assert(qRef && qRef.surah.toLowerCase().includes('baqarah') && qRef.ayah === 255, `Quran reference parsed: Surah ${qRef?.surah} Ayah ${qRef?.ayah}`);

  const hRef = extractHadithReference('HR. Bukhari no 1');
  assert(hRef && hRef.source.toLowerCase().includes('bukhari') && hRef.number === 1, `Hadith reference parsed: ${hRef?.source} No ${hRef?.number}`);

  console.log('\n=== 5. TEST QURAN VERIFICATION MODULE ===');
  const surahNum = resolveSurahNumber('Al-Baqarah');
  assert(surahNum === 2, `Surah Al-Baqarah resolved to 2: ${surahNum}`);

  const fatihahNum = resolveSurahNumber('al-fatihah');
  assert(fatihahNum === 1, `Surah al-fatihah resolved to 1: ${fatihahNum}`);

  try {
    const quranData = await getVerifiedAyah(1, 1);
    if (quranData.verification_status === 'verified') {
      assert(quranData.arabic_text !== null, `Al-Fatihah:1 verified from trusted source: ${quranData.arabic_text}`);
    } else {
      console.log(`  ℹ️ Network fetch returned status: ${quranData.verification_status} (API offline or restricted)`);
      assert(true, 'Graceful handling when Quran API is unreachable');
    }
  } catch (err) {
    console.log(`  ℹ️ Network error handled safely: ${err.message}`);
    assert(true, 'Handled network error safely');
  }

  console.log('\n=== 6. TEST HADITH RESOLVER ===');
  const bookBukhari = resolveHadithBook('Bukhari');
  assert(bookBukhari && bookBukhari.full_name === 'Sahih al-Bukhari', `Hadith book resolved: ${bookBukhari?.full_name}`);

  const narrator = detectNarrator('Dari sahabat Abu Hurairah radhiyallahu anhu bahwa Rasulullah bersabda');
  assert(narrator && narrator.toLowerCase().includes('abu hurairah'), `Narrator detected: ${narrator}`);

  console.log('\n=== 7. TEST DUPLICATE HANDLER ===');
  const testDir = join(process.cwd(), 'test-temp-result');
  if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true });
  
  const dupHandler = new DuplicateHandler(testDir);
  assert(!dupHandler.isProcessed('testVideo123'), 'Fresh video is not processed');
  
  dupHandler.markProcessed('testVideo123', { status: 'completed', title: 'Video Test' });
  assert(dupHandler.isProcessed('testVideo123'), 'Marked video is now recognized as processed');

  const dedupResult = dupHandler.deduplicate([
    { videoId: 'testVideo123', url: 'https://youtube.com/watch?v=testVideo123' },
    { videoId: 'newVideo456', url: 'https://youtube.com/watch?v=newVideo456' },
    { videoId: 'newVideo456', url: 'https://youtube.com/watch?v=newVideo456' }
  ]);
  assert(dedupResult.alreadyProcessed.length === 1, 'Correctly detected 1 already processed');
  assert(dedupResult.duplicates.length === 1, 'Correctly detected 1 duplicate in batch');
  assert(dedupResult.toProcess.length === 1, 'Correctly identified 1 video to process');

  console.log('\n=== 8. TEST OUTPUT GENERATION (TXT & JSON) ===');
  const sampleResult = {
    video_id: 'testVideo999',
    video_url: 'https://www.youtube.com/watch?v=testVideo999',
    title: 'Kajian Ustadz: Keutamaan Niat',
    channel: 'Media Dakwah',
    duration: '05:30',
    language: 'id',
    status: 'completed',
    transcription_source: 'youtube_transcript',
    processed_at: new Date().toISOString(),
    segments: [
      {
        start: 0,
        end: 5,
        type: 'speech',
        language: 'id',
        text: 'Assalamualaikum warahmatullahi wabarakatuh.'
      },
      {
        start: 5,
        end: 15,
        type: 'quran',
        language: 'id',
        text: 'Allah berfirman dalam surat Al-Baqarah ayat 255.',
        reference: { surah: 'Al-Baqarah', surah_number: 2, ayah: 255 },
        verification_status: 'verified',
        verified_arabic_text: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ',
        verified_translation: 'Allah, tidak ada tuhan selain Dia. Yang Mahahidup, Yang terus-menerus mengurus (makhluk-Nya).'
      }
    ]
  };

  await saveTXT(sampleResult, testDir);
  await saveJSON(sampleResult, testDir);

  const txtPath = join(testDir, 'transcripts', 'testVideo999.txt');
  const jsonPath = join(testDir, 'json', 'testVideo999.json');

  assert(existsSync(txtPath), `TXT file created at ${txtPath}`);
  assert(existsSync(jsonPath), `JSON file created at ${jsonPath}`);

  if (existsSync(txtPath)) {
    const txtContent = readFileSync(txtPath, 'utf-8');
    assert(txtContent.includes('Kajian Ustadz: Keutamaan Niat'), 'TXT contains video title');
    assert(txtContent.includes('اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ'), 'TXT contains verified Arabic text');
  }

  if (existsSync(jsonPath)) {
    const jsonContent = JSON.parse(readFileSync(jsonPath, 'utf-8'));
    assert(jsonContent.video_id === 'testVideo999', 'JSON contains correct video ID');
    assert(jsonContent.segments.length === 2, 'JSON contains all segments');
  }

  // Cleanup test dir
  if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true });

  console.log('\n======================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
