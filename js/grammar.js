// Grammar: lessons (explanation + interactive exercises), quick drills generated
// from the word list (der/die/das, plural, strong verbs) and spaced review of lessons.
import { state, save, today, dayStats } from './store.js';
import { fold, lev, checkSentence, sentTokens } from './check.js';
import * as D from './data.js';

let ctx = null; // helpers from app.js
export const lessons = [];
export const DRILLS = [
  { id: 'drill-gender', kind: 'gender', title: 'Der, die, das', sv: 'Gissa artikeln', icon: '🎨' },
  { id: 'drill-plural', kind: 'plural', title: 'Plural', sv: 'Skriv pluralformen', icon: '👥' },
  { id: 'drill-verbs', kind: 'verbs', title: 'Starka verb', sv: 'Presens, preteritum, perfekt', icon: '💪' },
];

export function setupGrammar(c) {
  ctx = c;
  for (const l of window.GRAMMAR || []) lessons.push({ ...l, items: parseEx(l.ex || '') });
}

// ---- parsing -----------------------------------------------------------------
function splitSv(s) {
  const i = s.lastIndexOf(' = ');
  return i < 0 ? [s.trim(), ''] : [s.slice(0, i).trim(), s.slice(i + 3).trim()];
}
function parseEx(txt) {
  const out = [];
  for (let line of txt.split('\n')) {
    line = line.trim();
    if (!line) continue;
    const k = line[0], rest = line.slice(1).trim();
    if (k === '?') {
      const [body, sv] = splitSv(rest);
      const [q, a, d] = body.split('|').map(x => x.trim());
      out.push({ t: 'mc', q, a, opts: [a, ...(d || '').split(',').map(x => x.trim()).filter(Boolean)], sv });
    } else if (k === '_') {
      const [body, sv] = splitSv(rest);
      const [q, a] = body.split('|').map(x => x.trim());
      out.push({ t: 'gap', q, a: a.split('/').map(x => x.trim()), sv });
    } else if (k === '~') {
      const [de, sv] = splitSv(rest);
      const v = de.split(/\s+\|\s+/);
      out.push({ t: 'order', de: v[0], alts: v.slice(1), sv });
    } else if (k === '>') {
      const [sv, de] = splitSv(rest);
      const v = de.split(/\s+\|\s+/);
      out.push({ t: 'tr', de: v[0], alts: v.slice(1), sv });
    }
  }
  return out;
}

// ---- generated drills from the word list --------------------------------------
export function autoItems(kind, level, n = 12) {
  const { shuffle } = ctx;
  const pool = D.words.filter(w => level === 'all' || w.level === level);
  if (kind === 'gender') {
    return shuffle(pool.filter(w => w.pos === 'noun' && !w.plOnly && !/\s/.test(w.noun))).slice(0, n)
      .map(w => ({ t: 'mc', q: `___ ${w.noun}`, a: w.article, opts: ['der', 'die', 'das'], fixed: true, sv: w.sv, why: genderTip(w) }));
  }
  if (kind === 'plural') {
    return shuffle(pool.filter(w => w.pos === 'noun' && w.plural && !w.plOnly && !/\s/.test(w.noun))).slice(0, n)
      .map(w => ({ t: 'gap', q: `${w.article} ${w.noun} → die ___`, a: [w.plural], sv: w.sv, why: w.plSpec ? `Pluraländelse: ${w.plSpec}` : '' }));
  }
  if (kind === 'verbs') {
    const vs = shuffle(pool.filter(w => w.pos === 'verb' && w.parts && w.parts.split(',').length >= 2 && !/\s/.test(w.de)));
    const out = [];
    for (const w of vs) {
      if (out.length >= n) break;
      const p = w.parts.split(',').map(x => x.trim());
      const perf = p[p.length - 1], prat = p[p.length - 2], pres = p.length >= 3 ? p[0] : null;
      const opts = [['Preteritum', prat, 'i dåtid: er ___ (gestern)'], ['Perfekt', perf, 'perfekt: er ___ (hjälpverb + particip)']];
      if (pres) opts.push(['Presens', pres, 'presens: er ___ (heute)']);
      const [name, ans, label] = opts[Math.floor(Math.random() * opts.length)];
      out.push({ t: 'gap', q: `${w.de} (${w.sv.replace(/^att /, '')}) – ${label}`, a: [ans], sv: '', why: `${w.de}: ${w.parts}` });
    }
    return out;
  }
  return [];
}

function genderTip(w) {
  const n = w.noun;
  if (/(ung|heit|keit|schaft|ion|tät|ik|ur|enz|anz|ie)$/.test(n) && w.article === 'die') return 'Ord på -ung, -heit, -keit, -schaft, -ion, -tät är alltid die.';
  if (/(chen|lein)$/.test(n)) return 'Ord på -chen och -lein är alltid das.';
  if (/(ment|um)$/.test(n) && w.article === 'das') return 'Ord på -ment och -um är oftast das.';
  if (/(ling|ismus|ich|ig)$/.test(n) && w.article === 'der') return 'Ord på -ling, -ismus, -ich, -ig är oftast der.';
  if (/e$/.test(n) && w.article === 'die') return 'Ord på -e är oftast die.';
  if (/^Ge/.test(n) && w.article === 'das') return 'Ord som börjar på Ge- är ofta das.';
  if (/(tag|monat)$/i.test(n) || ['Montag', 'Januar', 'Sommer', 'Winter', 'Herbst', 'Frühling'].includes(n)) return 'Veckodagar, månader och årstider är der.';
  return '';
}

// ---- lesson scheduling ----------------------------------------------------------
export function gradeLesson(id, score) {
  const g = state.grammar[id] || (state.grammar[id] = { ivl: 0, n: 0, best: 0 });
  g.n++;
  g.last = score;
  g.best = Math.max(g.best || 0, score);
  g.day = today();
  if (score >= 80) g.ivl = g.ivl ? Math.min(120, Math.round(g.ivl * 2.5)) : 3;
  else g.ivl = score >= 50 ? 1 : 0;
  g.due = today() + g.ivl;
  save();
}
export function lessonsDue() {
  const t = today();
  return lessons.filter(l => { const g = state.grammar[l.id]; return g && g.due <= t; });
}
export function nextLesson() {
  return lessons.find(l => !state.grammar[l.id]);
}

// ---- mini markdown for explanations ----------------------------------------------
function md(text) {
  const { esc, speakBtn } = ctx;
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>');
  const out = [];
  let list = null, table = null;
  const flush = () => {
    if (list) { out.push(`<ul>${list.join('')}</ul>`); list = null; }
    if (table) { out.push(`<div class="gtable-wrap"><table class="gtable">${table.map((r, i) => `<tr>${r.map(c => i === 0 ? `<th>${inline(c)}</th>` : `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</table></div>`); table = null; }
  };
  for (let line of text.split('\n')) {
    line = line.trim();
    if (!line) { flush(); continue; }
    if (line.startsWith('|')) { if (list) flush(); (table || (table = [])).push(line.replace(/^\||\|$/g, '').split('|').map(c => c.trim())); continue; }
    if (table) flush();
    if (line.startsWith('- ')) { (list || (list = [])).push(`<li>${inline(line.slice(2))}</li>`); continue; }
    flush();
    if (line.startsWith('## ')) out.push(`<h3>${inline(line.slice(3))}</h3>`);
    else if (line.startsWith('> ')) {
      const [de, sv] = splitSv(line.slice(2));
      out.push(`<div class="gex"><div><b>${inline(de)}</b> ${speakBtn(de.replace(/\*/g, ''), 'sm')}</div>${sv ? `<div class="muted">${inline(sv)}</div>` : ''}</div>`);
    } else out.push(`<p>${inline(line)}</p>`);
  }
  flush();
  return out.join('');
}

// ---- views -------------------------------------------------------------------------
let drillLevel = 'A1';
let openLesson = null;

export function renderGrammar(view) {
  const { esc, bindSpeak } = ctx;
  if (openLesson) return renderLesson(view, lessons.find(l => l.id === openLesson));
  const t = today();
  const due = lessonsDue();
  view.innerHTML = `
    <header class="top"><div><h1>Grammatik</h1><p class="muted">Korta förklaringar på svenska och interaktiva övningar. Lektioner du klarat kommer tillbaka för repetition.</p></div></header>
    <h3 class="sec">⚡ Snabbträning</h3>
    <div class="seg">${['A1', 'A2', 'B1', 'all'].map(l => `<button data-lv="${l}" class="${drillLevel === l ? 'on' : ''}">${l === 'all' ? 'Alla' : l}</button>`).join('')}</div>
    <div class="drills">${DRILLS.map(d => `<button class="card drill" data-d="${d.id}"><span class="ti-icon">${d.icon}</span><b>${d.title}</b><span class="muted small">${d.sv}</span>${state.grammar[d.id + '-' + drillLevel] ? `<span class="small">bästa: ${state.grammar[d.id + '-' + drillLevel].best} %</span>` : ''}</button>`).join('')}</div>
    ${due.length ? `<section class="card pre-learn"><b>🔁 ${due.length} lektioner att repetera</b><p class="muted small">${due.map(l => esc(l.title)).join(', ')}</p><button class="btn sm" id="rep">Repetera nu</button></section>` : ''}
    ${['A1', 'A2', 'B1'].map(lv => {
      const ls = lessons.filter(l => l.level === lv);
      if (!ls.length) return '';
      return `<h3 class="sec">${lv}</h3>` + ls.map((l, i) => {
        const g = state.grammar[l.id];
        const badge = !g ? '<span class="chip st-new">Ny</span>' : g.due <= t ? '<span class="chip st-learning">Repetera</span>' : `<span class="chip ${g.best >= 80 ? 'st-mastered' : 'st-learning'}">${g.best} %</span>`;
        return `<button class="card text-item" data-l="${l.id}"><span class="ti-icon gnum">${i + 1}</span><span class="ti-main"><b>${esc(l.title)}</b><span class="muted">${esc(l.sv || '')}</span></span><span class="ti-side">${badge}</span></button>`;
      }).join('');
    }).join('')}`;
  view.querySelectorAll('[data-lv]').forEach(b => b.addEventListener('click', () => { drillLevel = b.dataset.lv; renderGrammar(view); }));
  view.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', () => {
    const d = DRILLS.find(x => x.id === b.dataset.d);
    const lv = drillLevel;
    runExercises({ title: `${d.title} (${lv === 'all' ? 'alla nivåer' : lv})`, make: () => autoItems(d.kind, lv, 20), onDone: s => { const k = d.id + '-' + lv; const g = state.grammar[k] || (state.grammar[k] = { best: 0, n: 0, ivl: 9999, due: 1e9, drill: true }); g.best = Math.max(g.best, s); g.n++; save(); } });
  }));
  view.querySelectorAll('[data-l]').forEach(b => b.addEventListener('click', () => { openLesson = b.dataset.l; renderGrammar(view); window.scrollTo(0, 0); }));
  const rep = view.querySelector('#rep');
  rep && rep.addEventListener('click', () => startLessonPractice(due));
  bindSpeak(view);
}

function lessonItems(l, n = 12) {
  const { shuffle } = ctx;
  let items = shuffle(l.items.slice());
  if (l.auto) items = shuffle([...items.slice(0, Math.max(6, n - 6)), ...autoItems(l.auto, l.level === 'A1' ? 'A1' : 'all', 6)]);
  return items.slice(0, n);
}

function startLessonPractice(ls) {
  const { shuffle } = ctx;
  const make = () => shuffle(ls.flatMap(l => lessonItems(l, Math.max(4, Math.ceil(15 / ls.length))).map(it => ({ ...it, lesson: l.id }))));
  runExercises({ title: 'Repetition av grammatik', make, onDone: (s, perLesson) => { for (const [id, sc] of Object.entries(perLesson)) gradeLesson(id, sc); } });
}

function renderLesson(view, l) {
  const { esc, bindSpeak } = ctx;
  if (!l) { openLesson = null; return renderGrammar(view); }
  const g = state.grammar[l.id];
  const idx = lessons.indexOf(l);
  const next = lessons[idx + 1];
  view.innerHTML = `
    <header class="top sticky"><button class="icon-btn" id="back">‹</button><div class="grow"><h2>${esc(l.title)}</h2><p class="muted small">${esc(l.sv || '')} · ${l.level}${g ? ` · bästa resultat ${g.best} %` : ''}</p></div></header>
    <article class="card grammar-text">${md(l.text)}</article>
    <button class="btn big wide" id="practise">Öva (${Math.min(12, l.items.length + (l.auto ? 6 : 0))} uppgifter)</button>
    ${next ? `<button class="btn ghost wide" id="next">Nästa lektion: ${esc(next.title)} ›</button>` : ''}`;
  bindSpeak(view);
  view.querySelector('#back').addEventListener('click', () => { openLesson = null; renderGrammar(view); });
  view.querySelector('#practise').addEventListener('click', () => runExercises({ title: l.title, make: () => lessonItems(l), onDone: s => gradeLesson(l.id, s) }));
  const nx = view.querySelector('#next');
  nx && nx.addEventListener('click', () => { openLesson = next.id; renderLesson(view, next); window.scrollTo(0, 0); });
}

// ---- exercise runner -------------------------------------------------------------
let run = null;

export function runExercises(opts) {
  const { title, make, onDone } = opts;
  const items = make();
  if (!items.length) { ctx.toast('Inga uppgifter'); return; }
  run = { title, opts, queue: items.slice(), total: items.length, i: 0, points: 0, scored: 0, retried: new Set(), wrong: [], onDone, perLesson: {} };
  ctx.openOverlay();
  nextItem();
}

function shell(inner) {
  const { overlay } = ctx;
  const p = run.scored / run.total;
  overlay.innerHTML = `
    <div class="trainer">
      <div class="t-top"><button class="icon-btn" id="t-close" aria-label="Stäng">✕</button><div class="bar t-bar"><i style="width:${Math.round(p * 100)}%"></i></div><span class="muted small">${Math.min(run.scored + 1, run.total)}/${run.total}</span></div>
      <div class="t-kind"><span>${ctx.esc(run.title)}</span></div>
      <div class="t-body">${inner}</div>
    </div>`;
  overlay.querySelector('#t-close').addEventListener('click', () => { run = null; ctx.closeOverlay(); });
}

function blankHTML(q) {
  return ctx.esc(q).replace(/_{3,}/, '<span class="blank">____</span>');
}

function nextItem() {
  if (!run.queue.length) return finish();
  const it = run.queue.shift();
  run.cur = it;
  ({ mc: itemMC, gap: itemGap, order: itemOrder, tr: itemTr })[it.t](it);
}

function filled(it, ans) { return it.q.replace(/_{3,}/, ans); }

function feedback(it, grade, extraHTML = '', sayText = '') {
  const { esc, speak, bindSpeak, overlay } = ctx;
  const st = state;
  const first = !run.retried.has(it);
  if (first) {
    const pts = grade === 'correct' ? 1 : grade === 'almost' ? 0.5 : 0;
    run.points += pts; run.scored++;
    if (it.lesson) { const pl = run.perLesson[it.lesson] || (run.perLesson[it.lesson] = [0, 0]); pl[0] += pts; pl[1]++; }
    const ds = dayStats(); ds.xp++; if (grade === 'wrong') ds.bad++; else ds.ok++;
    if (grade === 'wrong') { run.retried.add(it); run.queue.push(it); run.wrong.push(it); }
  }
  const cls = grade === 'correct' ? 'ok' : grade === 'almost' ? 'almost' : 'bad';
  const title = grade === 'correct' ? '✅ Rätt!' : grade === 'almost' ? '🟡 Nästan' : '❌ Fel';
  const fb = overlay.querySelector('#fb');
  fb.innerHTML = `<div class="fb ${cls}"><div class="fb-title">${title}</div>${extraHTML}${it.why ? `<div class="small">💡 ${esc(it.why)}</div>` : ''}</div>
    <div class="t-actions"><button class="btn" id="cont">Fortsätt</button></div>`;
  bindSpeak(fb);
  if (sayText && st.settings.autoSpeak) speak(sayText);
  const cont = fb.querySelector('#cont');
  cont.addEventListener('click', nextItem);
  overlay.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); nextItem(); } };
  const inp = overlay.querySelector('input,textarea');
  if (inp) inp.focus(); else cont.focus({ preventScroll: true });
  if (grade === 'correct' && it.t === 'mc') setTimeout(() => { if (run && run.cur === it && document.body.contains(cont)) nextItem(); }, 900);
}

function itemMC(it) {
  const { esc, shuffle, speakBtn, overlay } = ctx;
  const opts = it.fixed ? it.opts.slice() : shuffle([...new Set(it.opts)]);
  shell(`
    <div class="gq">${blankHTML(it.q)}</div>
    ${it.sv ? `<div class="muted center">${esc(it.sv)}</div>` : ''}
    <div class="options ${it.fixed ? 'row3' : ''}">${opts.map((o, i) => `<button class="opt ${it.fixed ? 'g-' + o : ''}" data-i="${i}">${esc(o)}</button>`).join('')}</div>
    <div id="fb"></div>`);
  let done = false;
  overlay.querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => {
    if (done) return; done = true;
    const o = opts[+b.dataset.i];
    const ok = o === it.a;
    overlay.querySelectorAll('.opt').forEach((x, i) => { if (opts[i] === it.a) x.classList.add('right'); });
    if (!ok) b.classList.add('wrong');
    const full = filled(it, it.a);
    feedback(it, ok ? 'correct' : 'wrong', `<div class="fb-sent">${esc(full)} ${speakBtn(full)}</div>`, full);
  }));
  overlay.onkeydown = e => { const n = +e.key; if (n >= 1 && n <= opts.length) overlay.querySelectorAll('.opt')[n - 1].click(); };
}

function gradeText(v, answers) {
  const fv = fold(v);
  if (answers.some(a => fold(a) === fv)) return 'correct';
  if (answers.some(a => { const fa = fold(a); return fa.length >= 5 && lev(fv, fa) === 1; })) return 'almost';
  return 'wrong';
}

function itemGap(it) {
  const { esc, speakBtn, overlay, umlautBar } = ctx;
  shell(`
    <div class="gq">${blankHTML(it.q)}</div>
    ${it.sv ? `<div class="muted center">${esc(it.sv)}</div>` : ''}
    <form id="gform" autocomplete="off">
      <input id="ans" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" placeholder="Skriv…">
      <div id="uml"></div>
      <div class="t-actions" id="acts"><button type="button" class="btn ghost" id="dunno">Vet inte</button><button type="submit" class="btn">Kontrollera</button></div>
    </form>
    <div id="fb"></div>`);
  const input = overlay.querySelector('#ans');
  overlay.querySelector('#uml').appendChild(umlautBar(input));
  input.focus();
  let done = false;
  const finish = v => {
    done = true;
    const grade = v ? gradeText(v, it.a) : 'wrong';
    input.readOnly = true;
    input.classList.add(grade === 'correct' ? 'ok' : grade === 'almost' ? 'almost' : 'bad');
    overlay.querySelector('#acts').remove(); overlay.querySelector('#uml').remove();
    const full = it.q.includes('→') || it.q.includes('–') ? it.a[0] : filled(it, it.a[0]);
    feedback(it, grade, `<div class="fb-sent">${esc(full)} ${speakBtn(full)}</div>${grade !== 'correct' && v ? `<div class="small">Ditt svar: <del>${esc(v)}</del></div>` : ''}`, full);
  };
  overlay.querySelector('#gform').addEventListener('submit', e => { e.preventDefault(); if (done) { nextItem(); return; } const v = input.value.trim(); if (v) finish(v); });
  overlay.querySelector('#dunno').addEventListener('click', () => finish(''));
  overlay.onkeydown = null;
}

function itemOrder(it) {
  const { esc, shuffle, speakBtn, overlay } = ctx;
  const toks = sentTokens(it.de);
  let pool = shuffle(toks.map((v, i) => ({ v, i, used: false })));
  if (pool.map(p => p.v).join(' ') === toks.join(' ') && toks.length > 2) pool = shuffle(pool);
  const chosen = [];
  shell(`
    <div class="muted small">Sätt orden i rätt ordning:</div>
    <div class="gq sv-q">${esc(it.sv)}</div>
    <div class="tile-answer" id="ta"></div><div class="tile-pool" id="tp"></div>
    <div class="t-actions" id="acts"><button type="button" class="btn ghost" id="clear">Rensa</button><button type="button" class="btn" id="check">Kontrollera</button></div>
    <div id="fb"></div>`);
  let locked = false;
  const draw = () => {
    overlay.querySelector('#ta').innerHTML = chosen.map((p, k) => `<button class="tile" data-k="${k}">${esc(p.v)}</button>`).join('') || '<span class="muted small">Tryck på orden nedan</span>';
    overlay.querySelector('#tp').innerHTML = pool.map(p => `<button class="tile ${p.used ? 'used' : ''}" data-i="${p.i}" ${p.used ? 'disabled' : ''}>${esc(p.v)}</button>`).join('');
    overlay.querySelectorAll('#ta .tile').forEach(b => b.addEventListener('click', () => { if (locked) return; const p = chosen.splice(+b.dataset.k, 1)[0]; p.used = false; draw(); }));
    overlay.querySelectorAll('#tp .tile').forEach(b => b.addEventListener('click', () => { if (locked) return; const p = pool.find(x => x.i === +b.dataset.i); p.used = true; chosen.push(p); draw(); }));
  };
  draw();
  overlay.querySelector('#clear').addEventListener('click', () => { if (locked) return; chosen.splice(0).forEach(p => (p.used = false)); draw(); });
  overlay.querySelector('#check').addEventListener('click', () => {
    if (locked || !chosen.length) return;
    locked = true;
    const v = fold(chosen.map(p => p.v).join(' '));
    const ok = [it.de, ...it.alts].some(r => fold(sentTokens(r).join(' ')) === v);
    overlay.querySelector('#acts').remove();
    feedback(it, ok ? 'correct' : 'wrong', `<div class="fb-sent">${esc(it.de)} ${speakBtn(it.de)}</div>`, it.de);
  });
  overlay.onkeydown = null;
}

function itemTr(it) {
  const { esc, speakBtn, overlay, umlautBar } = ctx;
  shell(`
    <div class="muted small">Översätt till tyska:</div>
    <div class="gq sv-q">${esc(it.sv)}</div>
    <textarea id="sans" rows="3" autocomplete="off" autocorrect="off" autocapitalize="sentences" spellcheck="false" placeholder="Skriv på tyska…"></textarea>
    <div id="uml"></div>
    <div class="t-actions" id="acts"><button type="button" class="btn ghost" id="dunno">Visa svar</button><button type="button" class="btn" id="check">Kontrollera</button></div>
    <div id="fb"></div>`);
  const ta = overlay.querySelector('#sans');
  overlay.querySelector('#uml').appendChild(umlautBar(ta));
  ta.focus();
  let done = false;
  const finish = v => {
    done = true;
    ta.readOnly = true;
    overlay.querySelector('#acts').remove(); overlay.querySelector('#uml').remove();
    const r = v ? checkSentence(v, { de: it.de, alts: it.alts }) : { grade: 'wrong', parts: [], ref: it.de, msg: '' };
    const diffHTML = v && r.grade !== 'correct' ? `<div class="diff sent-diff">${r.parts.map(p => p.t === 'same' ? esc(p.v) : p.t === 'del' ? `<del>${esc(p.v)}</del>` : `<ins>${esc(p.v)}</ins>`).join(' ')}</div>` : '';
    feedback(it, r.grade, `${r.msg ? `<div>${esc(r.msg)}</div>` : ''}${diffHTML}<div class="fb-sent">${esc(r.ref)} ${speakBtn(r.ref)}</div>${v && r.grade !== 'correct' ? '<button class="btn ghost sm" id="ovr">Jag hade rätt</button>' : ''}`, r.ref);
    const ovr = overlay.querySelector('#ovr');
    ovr && ovr.addEventListener('click', () => {
      // turn a wrong first attempt into a correct one
      if (run.wrong.includes(it)) { run.wrong.splice(run.wrong.indexOf(it), 1); run.queue.splice(run.queue.indexOf(it), 1); run.points += r.grade === 'almost' ? 0.5 : 1; if (it.lesson) run.perLesson[it.lesson][0] += 1; }
      else if (r.grade === 'almost') { run.points += 0.5; if (it.lesson) run.perLesson[it.lesson][0] += 0.5; }
      nextItem();
    });
  };
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (done) nextItem(); else if (ta.value.trim()) finish(ta.value.trim()); } });
  overlay.querySelector('#check').addEventListener('click', () => { if (ta.value.trim()) finish(ta.value.trim()); });
  overlay.querySelector('#dunno').addEventListener('click', () => finish(''));
  overlay.onkeydown = null;
}

function finish() {
  const { overlay, esc } = ctx;
  const score = Math.round((run.points / Math.max(1, run.total)) * 100);
  const per = {};
  for (const [id, [p, n]] of Object.entries(run.perLesson)) per[id] = Math.round((p / n) * 100);
  run.onDone && run.onDone(score, per);
  const r = run;
  const verdict = score >= 90 ? 'Utmärkt! 🏆' : score >= 75 ? 'Bra jobbat! 💪' : score >= 50 ? 'På god väg 🙂' : 'Öva lite till 📚';
  overlay.innerHTML = `<div class="trainer"><div class="t-body center">
    <div class="big-emoji">${score >= 75 ? '🎉' : '🧩'}</div>
    <h2>${verdict}</h2>
    <p class="score-big">${score} %</p>
    <p class="muted">${esc(r.title)}</p>
    ${r.wrong.length ? `<div class="card left"><h3>Att tänka på</h3>${r.wrong.map(it => `<div class="wl-row">${esc(it.t === 'mc' || it.t === 'gap' ? (it.q.includes('___') ? filled(it, it.a[0] || it.a) : it.q + ' → ' + (Array.isArray(it.a) ? it.a[0] : it.a)) : it.de)}</div>`).join('')}</div>` : ''}
    <p class="muted small">${score >= 80 ? 'Lektionen kommer tillbaka för repetition om några dagar.' : 'Prova igen – den kommer tillbaka redan imorgon.'}</p>
    <div class="t-actions col"><button class="btn ghost" id="again">Öva igen</button><button class="btn" id="done">Klar</button></div></div></div>`;
  overlay.querySelector('#done').addEventListener('click', () => { run = null; ctx.closeOverlay(); });
  overlay.querySelector('#again').addEventListener('click', () => runExercises(r.opts));
}
export const _run = () => run;
