// Quiz: test words by level/topic. Results can feed back into learning.
import { state, save, today, dayStats } from './store.js';
import { checkWord } from './check.js';
import * as D from './data.js';
import * as S from './srs.js';

let ctx = null;
export function setupQuiz(c) { ctx = c; }

const opt = { level: 'A1', topic: 'all', which: 'all', mode: 'mix', n: 20 };
const MODES = [['mix', 'Blandat'], ['mc_de', 'Flerval: tyska → svenska'], ['mc_sv', 'Flerval: svenska → tyska'], ['type', 'Skriv på tyska'], ['article', 'Bara artiklar (der/die/das)']];
const WHICH = [['all', 'Alla ord'], ['started', 'Ord jag lär mig'], ['new', 'Ord jag inte lärt mig']];

function pool() {
  return D.words.filter(w => {
    if (opt.level !== 'all' && w.level !== opt.level) return false;
    if (opt.topic !== 'all' && w.topic !== opt.topic) return false;
    if (opt.which === 'started' && !S.isStarted(w.id)) return false;
    if (opt.which === 'new' && S.isStarted(w.id)) return false;
    if (opt.mode === 'article' && (w.pos !== 'noun' || w.plOnly)) return false;
    return true;
  });
}

export function renderQuiz(view) {
  const { esc } = ctx;
  const topics = D.topics.filter(t => opt.level === 'all' || t.level === opt.level);
  if (opt.topic !== 'all' && !topics.some(t => t.name === opt.topic)) opt.topic = 'all';
  const n = pool().length;
  const hist = (state.quiz || []).slice(-200);
  const best = lv => { const h = hist.filter(q => q.level === lv); return h.length ? Math.max(...h.map(q => q.score)) : null; };
  const last = hist.slice(-5).reverse();
  view.innerHTML = `
    <header class="top"><div><h1>Quiz</h1><p class="muted">Testa hur många ord du kan. Påverkar inte schemat – men du kan skicka felen till träningen efteråt.</p></div></header>
    <section class="card">
      <h3>Nivå</h3>
      <div class="seg">${['A1', 'A2', 'B1', 'all'].map(l => `<button data-lv="${l}" class="${opt.level === l ? 'on' : ''}">${l === 'all' ? 'Alla' : l}</button>`).join('')}</div>
      <label class="field">Ämne<select id="q-topic"><option value="all">Alla ämnen</option>${topics.map(t => `<option value="${esc(t.name)}" ${opt.topic === t.name ? 'selected' : ''}>${esc(t.name)}${opt.level === 'all' ? ` (${t.level})` : ''}</option>`).join('')}</select></label>
      <label class="field">Vilka ord<select id="q-which">${WHICH.map(([k, l]) => `<option value="${k}" ${opt.which === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="field">Typ av frågor<select id="q-mode">${MODES.map(([k, l]) => `<option value="${k}" ${opt.mode === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <h3>Antal frågor</h3>
      <div class="seg">${[10, 20, 50, 100].map(k => `<button data-n="${k}" class="${opt.n === k ? 'on' : ''}">${k}</button>`).join('')}</div>
      <p class="muted small">${n} ord matchar ditt val.</p>
      <button class="btn big wide" id="q-go" ${n ? '' : 'disabled'}>Starta quiz (${Math.min(n, opt.n)} frågor)</button>
    </section>
    <section class="grid3">${['A1', 'A2', 'B1'].map(lv => `<div class="stat"><b>${best(lv) ?? '–'}${best(lv) != null ? ' %' : ''}</b><span>bästa ${lv}</span></div>`).join('')}</section>
    ${last.length ? `<section class="card"><h3>Senaste quiz</h3>${last.map(q => `<div class="wl-row">${q.level === 'all' ? 'Alla' : q.level} · ${q.n} frågor · <b>${q.score} %</b> <span class="muted small">${dayLabel(q.d)}</span></div>`).join('')}</section>` : ''}`;
  view.querySelectorAll('[data-lv]').forEach(b => b.addEventListener('click', () => { opt.level = b.dataset.lv; renderQuiz(view); }));
  view.querySelectorAll('[data-n]').forEach(b => b.addEventListener('click', () => { opt.n = +b.dataset.n; renderQuiz(view); }));
  view.querySelector('#q-topic').addEventListener('change', e => { opt.topic = e.target.value; renderQuiz(view); });
  view.querySelector('#q-which').addEventListener('change', e => { opt.which = e.target.value; renderQuiz(view); });
  view.querySelector('#q-mode').addEventListener('change', e => { opt.mode = e.target.value; renderQuiz(view); });
  view.querySelector('#q-go').addEventListener('click', () => start());
}

function dayLabel(d) {
  const diff = today() - d;
  return diff === 0 ? 'idag' : diff === 1 ? 'igår' : `för ${diff} dagar sedan`;
}

// ---- running a quiz ------------------------------------------------------------
let q = null;

function start(words) {
  const { shuffle } = ctx;
  const list = words || shuffle(pool()).slice(0, opt.n);
  if (!list.length) return;
  const kinds = { mix: null, mc_de: 'mc_de', mc_sv: 'mc_sv', type: 'type', article: 'article' };
  q = {
    items: list.map(w => ({ w, kind: kinds[opt.mode] || ['mc_de', 'mc_sv', 'type', 'type'][Math.floor(Math.random() * 4)] })),
    i: 0, points: 0, results: [], settings: { ...opt },
  };
  ctx.openOverlay();
  next();
}

function shell(inner) {
  const { overlay } = ctx;
  const ok = q.results.filter(r => r.grade !== 'wrong').length;
  overlay.innerHTML = `
    <div class="trainer">
      <div class="t-top"><button class="icon-btn" id="t-close">✕</button><div class="bar t-bar"><i style="width:${Math.round((q.i / q.items.length) * 100)}%"></i></div><span class="muted small">${q.i + 1}/${q.items.length}</span></div>
      <div class="t-kind"><span>Quiz ${q.settings.level === 'all' ? '' : q.settings.level}</span><span class="chip">✓ ${ok}</span></div>
      <div class="t-body">${inner}</div>
    </div>`;
  overlay.querySelector('#t-close').addEventListener('click', () => { if (q.results.length && confirm('Avbryta quizet och visa resultatet?')) return results(); q = null; ctx.closeOverlay(); });
}

function next() {
  if (q.i >= q.items.length) return results();
  const it = q.items[q.i];
  ({ mc_de: mc, mc_sv: mc, type: typed, article: article })[it.kind](it);
}

function record(it, grade, given) {
  q.results.push({ w: it.w, grade, given, kind: it.kind });
  q.points += grade === 'correct' ? 1 : grade === 'almost' ? 0.5 : 0;
  const ds = dayStats(); ds.xp++; if (grade === 'wrong') ds.bad++; else ds.ok++;
  save();
}

function after(it, grade, extra = '') {
  const { overlay, esc, deHTML, speakBtn, bindSpeak, speak, speakText, infoHTML } = ctx;
  const cls = grade === 'correct' ? 'ok' : grade === 'almost' ? 'almost' : 'bad';
  const fb = overlay.querySelector('#fb');
  fb.innerHTML = `<div class="fb ${cls}"><div class="fb-title">${grade === 'correct' ? '✅ Rätt!' : grade === 'almost' ? '🟡 Nästan' : '❌ Fel'}</div>${extra}
      <div class="fb-word">${deHTML(it.w, 'lg')} ${speakBtn(speakText(it.w))}</div><div>${esc(it.w.sv)}</div><div class="muted small">${infoHTML(it.w)}</div></div>
    <div class="t-actions"><button class="btn" id="cont">Fortsätt</button></div>`;
  bindSpeak(fb);
  if (state.settings.autoSpeak) speak(speakText(it.w));
  const go = () => { if (!q || q.items[q.i] !== it) return; q.i++; next(); };
  fb.querySelector('#cont').addEventListener('click', go);
  overlay.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); go(); } };
  const inp = overlay.querySelector('input');
  if (inp) inp.focus(); else fb.querySelector('#cont').focus({ preventScroll: true });
  if (grade === 'correct' && it.kind !== 'type') setTimeout(go, 800);
}

function mc(it) {
  const { esc, shuffle, deHTML, speakBtn, speakText, distractors, overlay, speak } = ctx;
  const deToSv = it.kind === 'mc_de';
  const opts = shuffle([it.w, ...distractors(it.w)]);
  shell(`
    <div class="center">${deToSv ? `<div class="prompt">${deHTML(it.w, 'xl')}</div>${speakBtn(speakText(it.w))}` : `<div class="prompt sv-prompt">${esc(it.w.sv)}</div>`}</div>
    <div class="options">${opts.map((o, i) => `<button class="opt" data-i="${i}">${deToSv ? esc(o.sv) : deHTML(o)}</button>`).join('')}</div>
    <div id="fb"></div>`);
  if (deToSv && state.settings.autoSpeak) speak(speakText(it.w));
  let done = false;
  overlay.querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => {
    if (done) return; done = true;
    const o = opts[+b.dataset.i];
    const grade = o === it.w ? 'correct' : 'wrong';
    overlay.querySelectorAll('.opt').forEach((x, i) => { if (opts[i] === it.w) x.classList.add('right'); });
    if (grade === 'wrong') b.classList.add('wrong');
    record(it, grade, deToSv ? o.sv : o.de);
    after(it, grade);
  }));
  overlay.onkeydown = e => { const n = +e.key; if (n >= 1 && n <= 4) overlay.querySelectorAll('.opt')[n - 1].click(); };
}

function article(it) {
  const { esc, overlay } = ctx;
  shell(`
    <div class="center"><div class="prompt"><span class="de xl">___ ${esc(it.w.noun)}</span></div><div class="muted">${esc(it.w.sv)}</div></div>
    <div class="options row3">${['der', 'die', 'das'].map(a => `<button class="opt g-${a}" data-a="${a}">${a}</button>`).join('')}</div>
    <div id="fb"></div>`);
  let done = false;
  overlay.querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => {
    if (done) return; done = true;
    const grade = b.dataset.a === it.w.article ? 'correct' : 'wrong';
    overlay.querySelectorAll('.opt').forEach(x => { if (x.dataset.a === it.w.article) x.classList.add('right'); });
    if (grade === 'wrong') b.classList.add('wrong');
    record(it, grade, `${b.dataset.a} ${it.w.noun}`);
    after(it, grade);
  }));
  overlay.onkeydown = e => { const n = +e.key; if (n >= 1 && n <= 3) overlay.querySelectorAll('.opt')[n - 1].click(); };
}

function typed(it) {
  const { esc, overlay, umlautBar, typeHintLine } = ctx;
  shell(`
    <div class="center"><div class="prompt sv-prompt">${esc(it.w.sv)}</div><div class="muted small">${typeHintLine(it.w)}</div></div>
    <form id="qform" autocomplete="off">
      <input id="ans" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" placeholder="Skriv på tyska…">
      <div id="uml"></div>
      <div class="t-actions" id="acts"><button type="button" class="btn ghost" id="dunno">Vet inte</button><button type="submit" class="btn">Kontrollera</button></div>
    </form>
    <div id="fb"></div>`);
  const input = overlay.querySelector('#ans');
  overlay.querySelector('#uml').appendChild(umlautBar(input));
  input.focus();
  let done = false;
  const finish = v => {
    const r = v ? checkWord(v, it.w) : { grade: 'wrong', msg: '' };
    if (r.grade === 'synonym') { overlay.querySelector('#fb').innerHTML = `<div class="fb almost">${esc(r.msg)}</div>`; input.value = ''; input.focus(); return; }
    done = true;
    input.readOnly = true;
    input.classList.add(r.grade === 'correct' ? 'ok' : r.grade === 'almost' ? 'almost' : 'bad');
    overlay.querySelector('#acts').remove(); overlay.querySelector('#uml').remove();
    record(it, r.grade, v);
    after(it, r.grade, `${r.msg ? `<div>${esc(r.msg)}</div>` : ''}${v && r.grade !== 'correct' ? `<div class="small">Ditt svar: <del>${esc(v)}</del></div>` : ''}`);
  };
  overlay.querySelector('#qform').addEventListener('submit', e => {
    e.preventDefault();
    if (done) { q.i++; next(); return; }
    const v = input.value.trim(); if (v) finish(v);
  });
  overlay.querySelector('#dunno').addEventListener('click', () => finish(''));
  overlay.onkeydown = null;
}

function results() {
  const { overlay, esc, deHTML } = ctx;
  const n = q.results.length;
  const score = Math.round((q.points / Math.max(1, n)) * 100);
  (state.quiz || (state.quiz = [])).push({ d: today(), level: q.settings.level, n, score, mode: q.settings.mode });
  if (state.quiz.length > 300) state.quiz.splice(0, state.quiz.length - 300);
  save();
  const wrong = q.results.filter(r => r.grade !== 'correct');
  const rightNew = q.results.filter(r => r.grade === 'correct' && S.status(r.w.id) === 'new');
  const lv = q.settings.level === 'all' ? '' : ` på ${q.settings.level}-nivå`;
  const verdict = score >= 90 ? `Utmärkt! Du kan orden${lv} riktigt bra. 🏆` : score >= 75 ? 'Bra jobbat! 💪' : score >= 50 ? 'På god väg – fortsätt träna! 🙂' : 'Det här behöver du öva mer på. 📚';
  overlay.innerHTML = `<div class="trainer"><div class="t-top"><button class="icon-btn" id="t-close">✕</button></div><div class="t-body center">
    <div class="big-emoji">${score >= 75 ? '🎯' : '📝'}</div>
    <p class="score-big">${score} %</p>
    <h2>${verdict}</h2>
    <p class="muted">${n} frågor · ${q.results.filter(r => r.grade === 'correct').length} rätt · ${q.results.filter(r => r.grade === 'almost').length} nästan · ${q.results.filter(r => r.grade === 'wrong').length} fel</p>
    ${wrong.length ? `<div class="card left"><h3>Att öva på (${wrong.length})</h3>${wrong.map(r => `<div class="wl-row">${deHTML(r.w)} <span class="muted">= ${esc(r.w.sv)}</span>${r.given ? `<div class="small">Ditt svar: <del>${esc(r.given)}</del></div>` : ''}</div>`).join('')}</div>` : ''}
    <div class="t-actions col">
      ${wrong.length ? `<button class="btn" id="q-practice">Öva felen nu (${wrong.length})</button><button class="btn ghost" id="q-learn">Lägg felen i min träning</button>` : ''}
      ${rightNew.length ? `<button class="btn ghost" id="q-known">Markera ${rightNew.length} rätta nya ord som kända</button>` : ''}
      <button class="btn ghost" id="q-again">Nytt quiz med samma inställningar</button>
      <button class="btn ghost" id="q-done">Klar</button>
    </div></div></div>`;
  const close = () => { q = null; ctx.closeOverlay(); };
  overlay.querySelector('#t-close').addEventListener('click', close);
  overlay.querySelector('#q-done').addEventListener('click', close);
  overlay.querySelector('#q-again').addEventListener('click', () => { Object.assign(opt, q.settings); start(); });
  const pr = overlay.querySelector('#q-practice');
  pr && pr.addEventListener('click', () => { const ids = wrong.map(r => r.w.id); q = null; ctx.startSession({ reviews: ids, practice: true }); });
  const le = overlay.querySelector('#q-learn');
  le && le.addEventListener('click', () => {
    const t = today();
    for (const r of wrong) {
      const c = state.cards[r.w.id];
      if (!c || c.s === 0) S.prioritize(r.w.id);
      else if (c.s === 2) { c.due = t; c.ivl = Math.max(1, Math.round(c.ivl * 0.5)); }
    }
    save();
    le.disabled = true; le.textContent = '✓ Tillagda – de kommer i nästa träning';
  });
  const kn = overlay.querySelector('#q-known');
  kn && kn.addEventListener('click', () => {
    rightNew.forEach(r => S.markKnown(r.w.id, 4 + Math.floor(Math.random() * 4)));
    kn.disabled = true; kn.textContent = `✓ ${rightNew.length} ord markerade som kända (repeteras om några dagar)`;
  });
}
export const _q = () => q;
