// Validates the data files: counts, duplicates, parse problems, coverage.
// Usage: node tools/check-data.mjs [--uncovered]
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
globalThis.window = globalThis;
for (const f of fs.readdirSync(path.join(root, 'data')).sort()) {
  if (f.endsWith('.js')) (0, eval)(fs.readFileSync(path.join(root, 'data', f), 'utf8'));
}
const D = await import(pathToFileURL(path.join(root, 'js/data.js')));
D.init();
const raw = [];
for (const b of window.WORDS_RAW) for (const l of b.split('\n')) { const t = l.trim(); if (t && !t.startsWith('#') && !t.startsWith('@') && !t.startsWith('//')) raw.push(t); }
const ids = new Map();
for (const l of raw) { const de = l.split('|')[0].trim(); ids.set(de, (ids.get(de) || 0) + 1); }
const dups = [...ids].filter(([, n]) => n > 1).map(([k]) => k);
const byLevel = {};
for (const w of D.words) byLevel[w.level] = (byLevel[w.level] || 0) + 1;
const bad = raw.filter(l => l.split('|').length < 2 || /[Ѐ-ӿ]/.test(l));
const answerDup = new Map();
for (const w of D.words) { const k = w.de.toLowerCase(); answerDup.set(k, [...(answerDup.get(k) || []), w.id]); }
console.log('words:', D.words.length, byLevel, 'raw lines:', raw.length);
console.log('duplicate raw entries removed:', dups.length, dups.slice(0, 80).join(' · '));
console.log('same answer, different id:', [...answerDup].filter(([, v]) => v.length > 1).map(([, v]) => v.join(' / ')).join(' · '));
console.log('bad lines:', bad);
console.log('texts:', D.texts.length, 'sentences:', D.sentences.length);
const covered = D.words.filter(w => w.examples && w.examples.length).length;
console.log('words with example sentence:', covered, `(${Math.round(covered / D.words.length * 100)}%)`);
let unlinked = new Map();
for (const s of D.sentences) for (const t of s.tokens) if (t.w && !t.ids) unlinked.set(t.w, (unlinked.get(t.w) || 0) + 1);
console.log('unlinked tokens:', unlinked.size, [...unlinked].sort((a, b) => b[1] - a[1]).slice(0, 60).map(([k, v]) => `${k}(${v})`).join(' '));
if (process.argv.includes('--uncovered')) {
  const lv = process.argv[process.argv.indexOf('--uncovered') + 1] || '';
  console.log(D.words.filter(w => !(w.examples && w.examples.length) && (!lv || w.level === lv)).map(w => `${w.de} = ${w.sv}`).join('\n'));
}
// parse sanity
const nouns = D.words.filter(w => w.pos === 'noun');
console.log('nouns', nouns.length, 'verbs', D.words.filter(w => w.pos === 'verb').length, 'other', D.words.filter(w => w.pos === 'other').length);
if (process.argv.includes('--plurals')) console.log(nouns.filter(n => n.plural).map(n => `${n.noun} → ${n.plural}`).join(', '));
