// Answer checking for single words and whole sentences.
import { state } from './store.js';
import { words } from './data.js';

export function fold(s) {
  return s.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[.,!?;:"'„“”‚‘’»«()¿¡…–—]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}
const foldKeep = s => s.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue').replace(/ß/g, 'ss');
const clean = s => s.replace(/[.,!?;:"„“”»«]/g, ' ').replace(/\s+/g, ' ').trim();

export function lev(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) cur[j] = Math.min(cur[j], prev[j - 1]); // rough transposition
    }
    prev = cur;
  }
  return prev[n];
}

// LCS based diff of two arrays. returns [{t:'same'|'del'|'add', v}]
export function diff(a, b, eq = (x, y) => x === y) {
  const m = a.length, n = b.length;
  const L = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--)
    L[i][j] = eq(a[i], b[j]) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = [];
  let i = 0, j = 0;
  while (i < m && j < n) {
    if (eq(a[i], b[j])) { out.push({ t: 'same', v: b[j], u: a[i] }); i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) out.push({ t: 'del', v: a[i++] });
    else out.push({ t: 'add', v: b[j++] });
  }
  while (i < m) out.push({ t: 'del', v: a[i++] });
  while (j < n) out.push({ t: 'add', v: b[j++] });
  return out;
}

const ARTS = ['der', 'die', 'das'];

function splitArticle(s) {
  const m = s.match(/^(der|die|das|den|dem|des)\s+(.+)$/i);
  return m ? { art: m[1].toLowerCase(), rest: m[2] } : { art: null, rest: s };
}

function closeEnough(a, b) {
  const d = lev(a, b);
  const len = Math.max(a.length, b.length);
  return d === 0 ? 0 : (d === 1 && len >= 4) || (d === 2 && len >= 9) ? d : -1;
}

// result: {grade, msg, expected}
export function checkWord(input, w) {
  const raw = clean(input);
  const s = state.settings;
  if (!raw) return { grade: 'wrong', msg: '', expected: w.de };
  let best = null;
  for (const ans of w.answers) {
    const r = checkOne(raw, ans, w, s);
    if (!best || rank(r.grade) > rank(best.grade)) best = r;
  }
  if (best.grade === 'wrong') {
    // Did the user write another correct word for the same Swedish meaning?
    const syn = synonymOf(raw, w);
    if (syn) return { grade: 'synonym', msg: `„${syn.de}“ betyder också „${syn.sv}“ – men här söker vi ett annat ord. Försök igen!`, expected: w.de, syn };
  }
  return best;
}
const rank = g => ({ wrong: 0, almost: 1, correct: 2 }[g]);

function checkOne(raw, ans, w, s) {
  if (w.pos === 'noun') {
    const u = splitArticle(raw);
    const e = splitArticle(ans);
    const nounRes = compare(u.rest, e.rest, s, true);
    if (nounRes.grade === 'wrong') return { ...nounRes, expected: ans };
    if (!u.art) {
      if (s.requireArticle) return { grade: 'almost', msg: `Glöm inte artikeln: ${ans}`, expected: ans, artMissing: true };
      return { ...nounRes, expected: ans };
    }
    if (u.art !== e.art) return { grade: 'wrong', msg: `Fel artikel! Det heter ${ans}.`, expected: ans, wrongArt: true };
    return { ...nounRes, expected: ans };
  }
  let a = ans;
  let r = compare(raw, a, s, false);
  if (r.grade === 'wrong' && /^sich /.test(a)) r = compare(raw, a.replace(/^sich /, ''), s, false);
  return { ...r, expected: ans };
}

function compare(u, e, s, isNoun) {
  if (u === e) return { grade: 'correct', msg: '' };
  const fu = fold(u), fe = fold(e);
  if (fu === fe) {
    const usedAscii = foldKeep(u) !== u || u.toLowerCase() !== e.toLowerCase() && foldKeep(e) !== e;
    const caseWrong = foldKeep(u) !== foldKeep(e);
    if (caseWrong && isNoun && u[0] !== e[0]) {
      return s.strictCase
        ? { grade: 'almost', msg: 'Substantiv skrivs med stor bokstav på tyska.' }
        : { grade: 'correct', msg: 'Rätt! Tänk på att substantiv skrivs med stor bokstav.' };
    }
    if (usedAscii && u !== e) return { grade: 'correct', msg: 'Rätt! (ä/ö/ü/ß går att skriva ae/oe/ue/ss)' };
    return { grade: 'correct', msg: '' };
  }
  const d = closeEnough(fu, fe);
  if (d > 0) return { grade: 'almost', msg: 'Nästan! Kolla stavningen.', typo: true };
  return { grade: 'wrong', msg: '' };
}

function synonymOf(raw, w) {
  const fu = fold(splitArticle(raw).rest);
  const meanings = new Set(w.svList.map(x => x.toLowerCase()));
  for (const o of words) {
    if (o === w) continue;
    if (!o.svList.some(x => meanings.has(x.toLowerCase()))) continue;
    for (const a of o.answers) {
      const fa = fold(splitArticle(a).rest);
      if (fa === fu || closeEnough(fu, fa) > 0) return o;
    }
  }
  return null;
}

// --- sentences ---------------------------------------------------------------
export function sentTokens(s) { return clean(s).split(' ').filter(Boolean); }

export function checkSentence(input, s) {
  const refs = [s.de, ...(s.alts || [])];
  let best = null;
  for (const ref of refs) {
    const r = checkSentOne(input, ref);
    if (!best || r.score > best.score) best = r;
  }
  return best;
}

function checkSentOne(input, ref) {
  const ut = sentTokens(input), et = sentTokens(ref);
  const fu = ut.map(fold), fe = et.map(fold);
  const eq = (x, y) => x === y;
  const d = diff(fu, fe, eq);
  // map back to original tokens
  let iu = 0, ie = 0;
  const parts = d.map(p => {
    if (p.t === 'same') return { t: 'same', v: et[ie++], u: ut[iu++] };
    if (p.t === 'del') return { t: 'del', v: ut[iu++] };
    return { t: 'add', v: et[ie++] };
  });
  const same = parts.filter(p => p.t === 'same').length;
  const errors = Math.max(fu.length, fe.length) - same;
  const score = same / Math.max(1, fe.length) - (fu.length > fe.length ? (fu.length - fe.length) * 0.05 : 0);
  let grade = 'wrong', msg = '';
  if (errors === 0) {
    grade = 'correct';
    const caseErr = parts.some((p, k) => k > 0 && p.t === 'same' && p.u !== p.v && p.u.toLowerCase() === p.v.toLowerCase() && p.v[0] !== p.v[0].toLowerCase());
    if (caseErr) msg = 'Rätt! Tänk på stor bokstav för substantiv.';
  } else {
    const sortedU = [...fu].sort().join(' '), sortedE = [...fe].sort().join(' ');
    if (sortedU === sortedE) { grade = 'almost'; msg = 'Rätt ord, men annan ordföljd än facit. Är din ordföljd också korrekt tyska? Tryck då på ”Jag hade rätt”.'; }
    else if (errors === 1 && fu.length === fe.length) {
      const dels = d.filter(p => p.t === 'del'), adds = d.filter(p => p.t === 'add');
      if (dels.length === 1 && adds.length === 1 && closeEnough(dels[0].v, adds[0].v) > 0) { grade = 'almost'; msg = 'Nästan! Ett litet stavfel.'; }
      else { grade = 'almost'; msg = 'Nästan! Ett ord är fel.'; }
    } else if (errors <= 2 && fe.length >= 7) { grade = 'almost'; msg = 'Nästan rätt.'; }
  }
  return { grade, msg, parts, score, ref };
}
