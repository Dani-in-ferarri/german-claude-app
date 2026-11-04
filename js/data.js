// Parsing of vocabulary, texts and sentences + a form index used to link
// inflected words in texts back to their dictionary entries.

export const words = [];          // all word objects in learning order
export const byId = new Map();    // id -> word
export const texts = [];          // stories + dialogs
export const sentences = [];      // all practice sentences (texts + bank)
export const sentById = new Map();
export const topics = [];         // [{name, level, ids:[]}]
const formIndex = new Map();      // lowercase form -> [word ids]

const SEP_PREFIXES = ['zurück', 'zusammen', 'weiter', 'vorbei', 'heraus', 'herein', 'hinaus', 'hinein', 'fern', 'fest', 'frei', 'nach', 'heim', 'kennen', 'statt', 'teil', 'fort', 'weg', 'los', 'mit', 'vor', 'auf', 'aus', 'ein', 'ab', 'an', 'zu', 'her', 'hin', 'um', 'bei', 'dar', 'durch', 'über', 'unter', 'wieder'];
const INSEP = /^(be|ver|er|ent|zer|ge|emp|miss|hinter)/;
// irregular forms that the generic rules can't produce
const IRREG = {
  'sein (ist, war, ist gewesen)': 'bin bist ist sind seid war warst waren wart gewesen wäre wärst wären sei',
  'sein': 'bin bist ist sind seid war warst waren wart gewesen wäre wärst wären sei',
  'haben': 'habe hast hat habt hatte hattest hatten hattet gehabt hätte hättest hätten',
  'werden': 'werde wirst wird werdet wurde wurdest wurden worden geworden würde würdest würden',
  'können': 'kann kannst könnt konnte konntest konnten könnte könnten',
  'müssen': 'muss musst müsst musste musstest mussten müsste müssten',
  'wollen': 'will willst wollt wollte wolltest wollten',
  'sollen': 'soll sollst sollt sollte solltest sollten',
  'dürfen': 'darf darfst dürft durfte durftest durften dürfte dürften',
  'mögen': 'mag magst mögt mochte mochten möchte möchtest möchten möchtet',
  'möchten': 'möchte möchtest möchtet',
  'wissen': 'weiß weißt wisst wusste wussten gewusst',
  'tun': 'tue tust tut tat taten getan',
  'gut': 'besser bessere besseren besserer besseres beste besten bester bestes',
  'viel': 'mehr meiste meisten',
  'gern': 'lieber liebsten',
  'hoch': 'höher hohe hohen hoher hohes höchste höchsten',
  'nah': 'näher nächste nächsten',
  'in': 'im ins',
  'an': 'am ans',
  'zu': 'zum zur',
  'von': 'vom',
  'bei': 'beim',
  'ich': 'meiner',
};

export function hash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function umlaut(w) {
  return w.replace(/(au|a|o|u|A|O|U)(?=[^aouAOU]*$)/, m => ({ au: 'äu', a: 'ä', o: 'ö', u: 'ü', A: 'Ä', O: 'Ö', U: 'Ü' }[m]));
}

function pluralForm(noun, spec) {
  spec = spec.trim();
  if (!spec) return null;
  if (spec === '-') return noun;
  if (spec[0] === '¨') {
    const rest = spec.slice(1).replace(/^-/, '');
    return umlaut(noun) + rest;
  }
  if (spec[0] === '-') return noun + spec.slice(1);
  return spec; // full irregular plural written out
}

function addForm(form, id) {
  if (!form) return;
  const k = form.toLowerCase();
  if (k.length < 1) return;
  let arr = formIndex.get(k);
  if (!arr) formIndex.set(k, (arr = []));
  if (!arr.includes(id)) arr.push(id);
}

function verbForms(inf, add) {
  inf = inf.replace(/^sich /, '');
  if (inf.includes(' ')) { inf.split(' ').forEach(p => p.length > 3 && add(p)); return; }
  add(inf);
  const stem = inf.replace(/(e?n)$/, '');
  const needsE = /[dt]$|[^aeioulrhmn]m$|[^aeioulrhmn]n$/.test(stem);
  const e = needsE ? 'e' : '';
  ['e', e + 'st', e + 't', 'en', e + 'te', e + 'test', e + 'ten', e + 'tet', 'end', 'est', 'et', 'st', 't'].forEach(s => add(stem + s));
  add(stem); // imperative (geh!, mach!)
  if (INSEP.test(inf) || /ieren$/.test(inf)) add(stem + e + 't');
  else add('ge' + stem + e + 't');
  add('zu' + inf);
  // separable verbs: also index the separated base verb and ge/zu inside
  for (const p of SEP_PREFIXES) {
    if (inf.startsWith(p) && inf.length - p.length >= 3) {
      const base = inf.slice(p.length);
      const bstem = base.replace(/(e?n)$/, '');
      const be = /[dt]$/.test(bstem) ? 'e' : '';
      ['e', be + 'st', be + 't', 'en', be + 'te', be + 'ten', be + 'tet', ''].forEach(s => add(bstem + s));
      add(p + 'ge' + bstem + be + 't');
      add(p + 'zu' + base);
      break;
    }
  }
}

function adjForms(w, add) {
  add(w);
  if (w.length < 3 || /\s/.test(w)) return;
  if (/^(dieser|jeder|welcher|mancher|solcher|jener)$/.test(w)) ['e', 'en', 'em', 'es'].forEach(x => add(w.slice(0, -2) + x));
  ['e', 'en', 'er', 'es', 'em', 'ere', 'eren', 'erer', 'eres', 'erem', 'ste', 'sten', 'ster', 'stes', 'stem', 'este', 'esten'].forEach(s => add(w + s));
  if (w.endsWith('e')) ['n', 'r', 's', 'm'].forEach(s => add(w + s));
  if (/el$|er$/.test(w)) { const c = w.slice(0, -2) + w.slice(-1); ['e', 'en', 'er', 'es', 'em'].forEach(s => add(c + s)); }
  const u = umlaut(w);
  if (u !== w) ['er', 'ere', 'eren', 'erer', 'eres', 'sten', 'ste', 'este', 'esten'].forEach(s => add(u + s));
}

function parseWordLine(line, level, topic, order) {
  const parts = line.split('|').map(s => s.trim());
  if (parts.length < 2) return null;
  const raw = parts[0];
  const sv = parts[1];
  const note = parts[2] || '';
  const w = { raw, sv, note, level, topic, order };
  let hint = '';
  let de = raw.replace(/\s*\[(.+?)\]\s*/, (m, h) => { hint = h; return ' '; }).trim();
  w.hint = hint;
  const nm = de.match(/^(der|die|das) ([^,(]+?)(?:\s*\((Pl\.?|pl\.?)\))?(?:,\s*(.+))?$/);
  if (nm) {
    w.pos = 'noun';
    w.article = nm[1];
    w.noun = nm[2].trim();
    w.plOnly = !!nm[3];
    w.de = `${nm[1]} ${w.noun}`;
    if (nm[4]) {
      const pl = pluralForm(w.noun, nm[4]);
      if (pl) w.plural = pl;
      w.plSpec = nm[4].trim();
    }
  } else {
    const vm = de.match(/^([^()]+?)\s*\((.+)\)$/);
    let base = de, parts2 = null;
    if (vm) { base = vm[1].trim(); parts2 = vm[2]; }
    w.de = base;
    if (/^att /.test(sv)) { w.pos = 'verb'; if (parts2) w.parts = parts2; }
    else { w.pos = 'other'; if (parts2) w.extra = parts2; }
  }
  // accepted German answers: "a / b" alternatives
  w.answers = w.de.split(/\s*\/\s*/).filter(Boolean);
  w.id = w.de + (hint ? ` [${hint}]` : '');
  w.svList = sv.replace(/\(.*?\)/g, '').split(/[,;/]/).map(s => s.trim().replace(/^att /, '').replace(/^(en|ett) /, '')).filter(Boolean);
  return w;
}

function indexWord(w) {
  const add = f => addForm(f, w.id);
  const irr = IRREG[w.raw] || IRREG[w.de];
  if (irr && !(w.de === 'sein' && w.hint)) irr.split(' ').forEach(add);
  if (w.pos === 'noun') {
    add(w.noun);
    if (w.plural) {
      add(w.plural);
      if (!/[ns]$/.test(w.plural)) add(w.plural + 'n');
    }
    if (!/s$/.test(w.noun)) { add(w.noun + 's'); add(w.noun + 'es'); }
    add(w.noun + 'n'); add(w.noun + 'en');
    if (/e$/.test(w.noun)) add(w.noun + 'n');
  } else if (w.pos === 'verb') {
    w.answers.forEach(a => verbForms(a, add));
    if (w.parts) {
      w.parts.split(',').forEach(p => {
        const toks = p.trim().split(/\s+/).filter(t => !['ist', 'hat', 'sich', 'er', 'sie', 'es'].includes(t));
        toks.forEach(t => {
          add(t);
          if (!/[^e]n$/.test(t)) { add(t + 'st'); add(t + 'en'); add(t + 't'); add(t + 'e'); add(t + 'est'); }
          // present stem change (fährt -> fährst)
          if (/t$/.test(t) && toks.length === 1) { add(t.slice(0, -1) + 'st'); add(t.slice(0, -1)); }
        });
      });
    }
  } else {
    w.answers.forEach(a => {
      if (a.includes(' ')) { add(a); a.split(' ').forEach(p => p.length > 3 && add(p)); }
      else adjForms(a, add);
    });
    if (w.extra) w.extra.split(/[,;]/).forEach(x => x.trim().split(/\s+/).forEach(t => t.length > 1 && add(t)));
  }
}

// ---- tokenization for texts --------------------------------------------
const TOKEN_RE = /([A-Za-zÄÖÜäöüßéèàáÉ]+(?:-[A-Za-zÄÖÜäöüß]+)*)|([^A-Za-zÄÖÜäöüßéèàáÉ]+)/g;
export function tokenize(s) {
  const out = [];
  let m;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(s))) out.push(m[1] ? { w: m[1] } : { p: m[2] });
  return out;
}

export function lookup(token) {
  const k = token.toLowerCase();
  let ids = formIndex.get(k);
  if (!ids && k.includes('-')) ids = formIndex.get(k.split('-').pop());
  if (!ids) return [];
  // prefer nouns for capitalized tokens, others for lowercase
  const cap = token[0] !== token[0].toLowerCase();
  return ids.map(id => byId.get(id)).filter(Boolean).sort((a, b) => {
    const xa = (a.noun || a.de) === token ? 0 : 1, xb = (b.noun || b.de) === token ? 0 : 1;
    if (xa !== xb) return xa - xb;
    const sa = (a.pos === 'noun') === cap ? 0 : 1;
    const sb = (b.pos === 'noun') === cap ? 0 : 1;
    if (sa !== sb) return sa - sb;
    const ea = (a.noun || a.de).toLowerCase() === k ? 0 : 1;
    const eb = (b.noun || b.de).toLowerCase() === k ? 0 : 1;
    return ea - eb || a.order - b.order;
  });
}

function parseSentenceLine(line) {
  const i = line.indexOf(' = ');
  if (i < 0) return null;
  let de = line.slice(0, i).trim();
  const sv = line.slice(i + 3).trim();
  let speaker = '';
  const sm = de.match(/^([A-ZÄÖÜ][\wäöüß. ]{0,20}):\s+(.*)$/);
  if (sm) { speaker = sm[1]; de = sm[2]; }
  const variants = de.split(/\s+\|\s+/);
  return { de: variants[0], alts: variants.slice(1), sv: sv.replace(/^[A-ZÅÄÖ][\wåäö. ]{0,20}:\s+/, m => (speaker ? '' : m)), speaker };
}

let phrases = null; // [{w, parts:[...]}]
function phraseList() {
  if (phrases) return phrases;
  phrases = [];
  for (const w of words) for (const a of w.answers) {
    const parts = a.replace(/^sich /, '').toLowerCase().split(/\s+|…/).map(x => x.trim()).filter(Boolean);
    if (parts.length > 1 && w.pos !== 'noun') phrases.push({ w, parts, gap: a.includes('…') });
  }
  return phrases;
}

function linkSentence(s) {
  const ids = new Set();
  s.tokens = tokenize(s.de);
  const wt = s.tokens.filter(t => t.w);
  const low = wt.map(t => t.w.toLowerCase());
  // words standing at the end of a clause (where separable prefixes go)
  const finals = new Set();
  s.tokens.forEach((t, k) => {
    if (!t.w) return;
    const nx = s.tokens[k + 1];
    if (!nx || /[.,!?;:–]/.test(nx.p || '')) finals.add(t.w.toLowerCase() + '@' + wt.indexOf(t));
  });
  const finalAfter = (p, i) => [...finals].some(f => { const [w, j] = f.split('@'); return w === p && +j > i; });
  wt.forEach((t, i) => {
    let c = lookup(t.w);
    if (!c.length) return;
    // separable verb: "stehe ... auf" -> aufstehen
    const sep = c.find(w => w.pos === 'verb' && SEP_PREFIXES.some(p => w.de.replace(/^sich /, '').startsWith(p) && finalAfter(p, i)));
    if (sep) c = [sep, ...c.filter(x => x !== sep)];
    // reflexive verb: "wir treffen uns" -> sich treffen
    if (c[0].pos === 'verb' && low.some(x => ['mich', 'dich', 'sich', 'uns', 'euch', 'mir', 'dir'].includes(x))) {
      const refl = c.find(w => w.pos === 'verb' && w.de.startsWith('sich ') && (!sep || w.de.replace(/^sich /, '') === sep.de));
      if (refl) c = [refl, ...c.filter(x => x !== refl)];
    }
    t.ids = c.map(x => x.id);
    ids.add(c[0].id);
  });
  // multi-word expressions ("guten Abend", "zum Beispiel", "entweder … oder")
  for (const ph of phraseList()) {
    let start = -1;
    if (ph.gap) {
      let k = 0;
      for (let i = 0; i < low.length && k < ph.parts.length; i++) if (low[i] === ph.parts[k]) { if (k === 0) start = i; k++; }
      if (k < ph.parts.length) continue;
    } else {
      for (let i = 0; i + ph.parts.length <= low.length; i++) if (ph.parts.every((p, j) => low[i + j] === p)) { start = i; break; }
      if (start < 0) continue;
      for (let j = 0; j < ph.parts.length; j++) { const t = wt[start + j]; t.ids = [ph.w.id, ...(t.ids || []).filter(x => x !== ph.w.id)]; }
    }
    ids.add(ph.w.id);
  }
  s.wordIds = [...ids];
}

function registerSentence(s, source) {
  s.id = hash(s.de);
  if (sentById.has(s.id)) { sentById.get(s.id).sources.push(source); return sentById.get(s.id); }
  s.sources = [source];
  linkSentence(s);
  sentById.set(s.id, s);
  sentences.push(s);
  return s;
}

export function init() {
  let order = 0;
  const seen = new Set();
  for (const block of window.WORDS_RAW || []) {
    let level = 'A1', topic = 'Övrigt', tobj = null;
    for (let line of block.split('\n')) {
      line = line.trim();
      if (!line || line.startsWith('//')) continue;
      if (line.startsWith('@')) { level = line.slice(1).trim(); continue; }
      if (line.startsWith('#')) {
        topic = line.slice(1).trim();
        tobj = { name: topic, level, ids: [] };
        topics.push(tobj);
        continue;
      }
      const w = parseWordLine(line, level, topic, order);
      if (!w || seen.has(w.id)) continue;
      seen.add(w.id);
      w.order = order++;
      words.push(w);
      byId.set(w.id, w);
      if (!tobj) { tobj = { name: topic, level, ids: [] }; topics.push(tobj); }
      tobj.ids.push(w.id);
    }
  }
  words.forEach(indexWord);

  for (const t of window.TEXTS || []) {
    const paras = [];
    let cur = [];
    for (let line of t.text.split('\n')) {
      line = line.trim();
      if (!line) { if (cur.length) { paras.push(cur); cur = []; } continue; }
      const s = parseSentenceLine(line);
      if (!s) continue;
      cur.push(registerSentence(s, t.id));
      if (s.speaker) cur[cur.length - 1].speaker = s.speaker;
    }
    if (cur.length) paras.push(cur);
    const obj = { ...t, paras, sents: paras.flat() };
    const ids = new Set();
    obj.sents.forEach(s => s.wordIds.forEach(i => ids.add(i)));
    obj.wordIds = [...ids];
    texts.push(obj);
  }

  for (const block of window.SENTENCES_RAW || []) {
    let level = 'A1';
    for (let line of block.split('\n')) {
      line = line.trim();
      if (!line || line.startsWith('//')) continue;
      if (line.startsWith('@')) { level = line.slice(1).trim(); continue; }
      const s = parseSentenceLine(line);
      if (!s) continue;
      s.level = level;
      registerSentence(s, 'bank');
    }
  }
  // level of text sentences
  texts.forEach(t => t.sents.forEach(s => { if (!s.level) s.level = t.level; }));

  // examples per word (shortest sentences first)
  const ex = new Map();
  for (const s of sentences) for (const id of s.wordIds) {
    let a = ex.get(id); if (!a) ex.set(id, (a = [])); a.push(s);
  }
  for (const [id, arr] of ex) {
    const w = byId.get(id);
    if (w) w.examples = arr.sort((a, b) => a.de.length - b.de.length);
  }
}

export function examplesFor(w) { return w.examples || []; }

// The surface form of the word inside a sentence (for cloze exercises)
export function formInSentence(w, s) {
  for (const t of s.tokens) if (t.ids && t.ids[0] === w.id) return t.w;
  for (const t of s.tokens) if (t.ids && t.ids.includes(w.id)) return t.w;
  return null;
}
