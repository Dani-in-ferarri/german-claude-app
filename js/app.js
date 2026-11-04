import * as D from './data.js';
import { state, load, save, today, dayStats, streak, exportJSON, importJSON, resetAll, DEFAULT_SETTINGS } from './store.js';
import * as S from './srs.js';
import { checkWord, checkSentence, fold, diff, sentTokens, lev } from './check.js';
import { speak, stop as stopSpeech, canSpeak } from './speech.js';

window.APP_VERSION = '1.0.0';
load();
D.init();

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const view = $('#view');
const overlay = $('#overlay');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pct = x => Math.round(x * 100);
const LEVELS = ['A1', 'A2', 'B1'];

// ----------------------------------------------------------------------------
// small UI helpers
function deHTML(w, cls = '') {
  if (w.pos === 'noun') return `<span class="de ${cls}"><span class="art g-${w.article}">${w.article}</span> ${esc(w.noun)}</span>`;
  return `<span class="de ${cls}">${esc(w.de)}</span>`;
}
function infoHTML(w) {
  const out = [];
  if (w.pos === 'noun') {
    if (w.plOnly) out.push('endast plural');
    else if (w.plural) out.push(`plural: die ${esc(w.plural)}`);
    else out.push('ingen plural');
  }
  if (w.parts) out.push(esc(w.parts));
  if (w.extra) out.push(esc(w.extra));
  if (w.hint) out.push(esc(w.hint));
  if (w.note) out.push(esc(w.note));
  return out.join(' · ');
}
function speakText(w) { return w.pos === 'noun' ? `${w.article} ${w.noun}` : w.de.split(' / ')[0]; }
function speakBtn(text, cls = '') {
  if (!canSpeak()) return '';
  return `<button class="icon-btn speak ${cls}" data-say="${esc(text)}" aria-label="Lyssna">🔊</button>`;
}
function bindSpeak(root) {
  $$('[data-say]', root).forEach(b => b.addEventListener('click', e => { e.stopPropagation(); speak(b.dataset.say); }));
}
const STATUS_SV = { new: 'Ny', learning: 'Lär mig', review: 'Repeteras', mastered: 'Kan', hard: 'Svår' };
function statusChip(id) { const st = S.status(id); return `<span class="chip st-${st}">${STATUS_SV[st]}</span>`; }

function toast(msg, ms = 2200) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), ms);
}

function openSheet(html, bind) {
  const sh = $('#sheet'), bd = $('#sheet-backdrop');
  sh.innerHTML = `<div class="sheet-grip"></div><div class="sheet-body">${html}</div>`;
  sh.hidden = false; bd.hidden = false;
  requestAnimationFrame(() => { sh.classList.add('open'); bd.classList.add('open'); });
  bindSpeak(sh);
  bind && bind(sh);
}
function closeSheet() {
  const sh = $('#sheet'), bd = $('#sheet-backdrop');
  sh.classList.remove('open'); bd.classList.remove('open');
  setTimeout(() => { sh.hidden = true; bd.hidden = true; }, 200);
}
$('#sheet-backdrop').addEventListener('click', closeSheet);

function umlautBar(target) {
  const bar = document.createElement('div');
  bar.className = 'umlauts';
  ['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü'].forEach(ch => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = ch;
    const ins = () => {
      const el = typeof target === 'function' ? target() : target;
      if (!el || el.readOnly) return;
      const s = el.selectionStart ?? el.value.length, e = el.selectionEnd ?? el.value.length;
      el.setRangeText(ch, s, e, 'end');
      el.dispatchEvent(new Event('input'));
      el.focus();
    };
    b.addEventListener('touchstart', ev => { ev.preventDefault(); ins(); }, { passive: false });
    b.addEventListener('mousedown', ev => ev.preventDefault());
    b.addEventListener('click', ins);
    bar.appendChild(b);
  });
  return bar;
}

// ----------------------------------------------------------------------------
// word detail sheet
function wordSheet(w, extra = '') {
  const c = state.cards[w.id];
  const st = S.status(w.id);
  const ex = D.examplesFor(w).slice(0, 3);
  let sched = '';
  if (c && c.s === 2) {
    const d = c.due - today();
    sched = `<p class="muted small">Intervall ${c.ivl} d · nästa repetition ${d <= 0 ? 'idag' : d === 1 ? 'imorgon' : `om ${d} dagar`} · ${c.ok || 0} rätt, ${c.bad || 0} fel</p>`;
  } else if (c && c.s === 1) sched = '<p class="muted small">Du håller på att lära dig ordet.</p>';
  openSheet(`
    ${extra}
    <div class="ws-head">${deHTML(w, 'xl')} ${speakBtn(speakText(w))}</div>
    <div class="ws-sv">${esc(w.sv)}</div>
    <div class="muted small">${infoHTML(w)}</div>
    <div class="muted small">${w.level} · ${esc(w.topic)} ${statusChip(w.id)}</div>
    ${sched}
    ${ex.length ? `<div class="examples">${ex.map(s => `<div class="ex"><div>${esc(s.de)} ${speakBtn(s.de, 'sm')}</div><div class="muted">${esc(s.sv)}</div></div>`).join('')}</div>` : ''}
    <label class="note-label">Egen minnesregel / anteckning
      <textarea id="note" rows="2" placeholder="t.ex. en bild eller ramsa som hjälper dig minnas">${esc(state.notes[w.id] || '')}</textarea></label>
    <div class="btn-row">
      ${st === 'new' ? `<button class="btn" data-a="prio">Lär mig detta ord</button><button class="btn ghost" data-a="known">Kan redan</button>` : `<button class="btn ghost" data-a="reset">Börja om med ordet</button>`}
    </div>`, sh => {
    $('#note', sh).addEventListener('input', e => { const v = e.target.value.trim(); if (v) state.notes[w.id] = v; else delete state.notes[w.id]; save(); });
    const a = $('[data-a=prio]', sh); a && a.addEventListener('click', () => { S.prioritize(w.id); toast('Ordet kommer i nästa träning'); closeSheet(); render(); });
    const k = $('[data-a=known]', sh); k && k.addEventListener('click', () => { S.markKnown(w.id); toast('Markerat som känt – det repeteras om några dagar'); closeSheet(); render(); });
    const r = $('[data-a=reset]', sh); r && r.addEventListener('click', () => { if (confirm('Nollställa ordet?')) { S.resetCard(w.id); closeSheet(); render(); } });
  });
}

// ----------------------------------------------------------------------------
// navigation
let tab = 'home';
let sub = null; // e.g. open text id
function go(t, s = null) { tab = t; sub = s; render(); view.scrollTop = 0; window.scrollTo(0, 0); }
$$('#tabs button').forEach(b => b.addEventListener('click', () => go(b.dataset.tab)));

function render() {
  $$('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  ({ home: renderHome, read: renderRead, write: renderWrite, words: renderWords, more: renderMore })[tab]();
}

// ----------------------------------------------------------------------------
// HOME
function countStatus() {
  const c = { new: 0, learning: 0, review: 0, mastered: 0, hard: 0 };
  for (const w of D.words) c[S.status(w.id)]++;
  return c;
}

function renderHome() {
  const due = S.dueIds();
  const learning = S.learningIds();
  const newLeft = Math.min(S.newLeftToday(), S.nextNewIds(S.newLeftToday()).length);
  const ds = dayStats();
  const cnt = countStatus();
  const goal = state.settings.dailyGoal;
  const prog = Math.min(1, ds.xp / goal);
  const st = streak();
  const sentDue = sentenceQueue(1000, true).length;
  const hard = D.words.filter(w => S.status(w.id) === 'hard').length;
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  const suggestion = suggestText();
  const total = due.length + learning.length + newLeft;

  view.innerHTML = `
  <header class="top">
    <div><h1>Hallo! 👋</h1><p class="muted">${new Date().toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })}</p></div>
    <div class="streak" title="Dagar i rad">🔥 ${st}</div>
  </header>
  ${isIOS && !standalone ? `<div class="card install">📲 <b>Installera appen:</b> tryck på <b>Dela</b> <span class="ios-share">⬆︎</span> i Safari och välj <b>”Lägg till på hemskärmen”</b>. Då fungerar den offline.</div>` : ''}
  ${!state.onboarded ? onboardingHTML() : ''}
  <section class="card hero">
    <div class="ring" style="--p:${prog}"><div><b>${ds.xp}</b><span>/${goal}</span></div></div>
    <div class="hero-text">
      <h2>Dagens träning</h2>
      ${total ? `<p>${due.length ? `<b>${due.length}</b> repetitioner` : ''}${due.length && (newLeft + learning.length) ? ' · ' : ''}${newLeft + learning.length ? `<b>${newLeft + learning.length}</b> nya ord` : ''}</p>
      <button class="btn big" id="start">Starta</button>`
      : `<p>Allt klart för idag! 🎉 Kom tillbaka imorgon – det är då repetitionen gör jobbet.</p>
      <button class="btn" id="more-new">Lär mig 5 nya ord till</button>`}
    </div>
  </section>
  <section class="grid3">
    <div class="stat"><b>${cnt.learning + cnt.review + cnt.hard + cnt.mastered}</b><span>påbörjade</span></div>
    <div class="stat"><b>${cnt.mastered}</b><span>behärskade</span></div>
    <div class="stat"><b>${D.words.length}</b><span>ord totalt</span></div>
  </section>
  <section class="card">
    <h3>Nivåer</h3>
    ${LEVELS.map(l => {
      const ws = D.words.filter(w => w.level === l);
      const m = ws.filter(w => S.status(w.id) === 'mastered').length;
      const s2 = ws.filter(w => S.isStarted(w.id)).length;
      return `<div class="lvl"><span class="lvl-name">${l}</span><div class="bar"><i class="b2" style="width:${pct(s2 / ws.length)}%"></i><i style="width:${pct(m / ws.length)}%"></i></div><span class="muted small">${s2}/${ws.length}</span></div>`;
    }).join('')}
    <p class="muted small legend"><i class="dot b2"></i> påbörjade <i class="dot"></i> behärskade (intervall ≥ ${S.MASTERED} dagar)</p>
  </section>
  ${suggestion ? `<section class="card link" id="sugg"><h3>📖 Läs nu</h3><p><b>${esc(suggestion.t.title)}</b> <span class="muted">– ${esc(suggestion.t.sv)}</span></p><p class="muted small">${suggestion.t.level} · ${pct(suggestion.cov)} % av orden kan du redan</p></section>` : ''}
  <section class="card link" id="go-write"><h3>✍️ Skriv meningar</h3><p class="muted">${sentDue ? `${sentDue} meningar väntar på dig.` : 'Översätt meningar från svenska till tyska med orden du lärt dig.'}</p></section>
  ${hard ? `<section class="card link" id="go-hard"><h3>🧠 Svåra ord (${hard})</h3><p class="muted">Ord du glömt flera gånger. Öva extra – och skriv gärna en minnesregel.</p></section>` : ''}
  ${S.learningIds().length + cnt.review + cnt.mastered > 0 ? `<button class="btn ghost wide" id="practice">Extraövning (påverkar inte schemat)</button>` : ''}
  `;
  const sb = $('#start'); sb && sb.addEventListener('click', () => startDaily());
  const mn = $('#more-new'); mn && mn.addEventListener('click', () => startSession({ fresh: S.nextNewIds(5) }));
  const sg = $('#sugg'); sg && sg.addEventListener('click', () => go('read', suggestion.t.id));
  $('#go-write').addEventListener('click', () => go('write'));
  const gh = $('#go-hard'); gh && gh.addEventListener('click', () => startSession({ reviews: shuffle(D.words.filter(w => S.status(w.id) === 'hard').map(w => w.id)).slice(0, 20), practice: true }));
  const pr = $('#practice'); pr && pr.addEventListener('click', startPractice);
  const ob = $('#ob-ok'); ob && ob.addEventListener('click', () => { state.onboarded = true; save(); render(); });
}

function onboardingHTML() {
  return `<section class="card onboard">
    <h2>Välkommen! 🇩🇪→🇸🇪</h2>
    <p>Appen lär dig ${D.words.length} vanliga tyska ord – på riktigt, inte bara en gång:</p>
    <ol>
      <li><b>Nytt ord:</b> du ser ordet, hör det och ser det i en mening.</li>
      <li><b>Samma dag:</b> du känner igen det, väljer det och till sist <b>skriver</b> du det själv – utspritt över passet.</li>
      <li><b>Repetition:</b> ordet kommer tillbaka efter 1, 3, 7, 18, 45… dagar – precis innan du hade glömt det. Gör du fel kommer det tillbaka tidigare.</li>
      <li><b>Använd orden:</b> läs berättelser och samtal och skriv egna översättningar av meningar.</li>
    </ol>
    <p class="muted small">Tips: 10–15 minuter varje dag slår 2 timmar en gång i veckan.</p>
    <button class="btn" id="ob-ok">Då kör vi!</button>
  </section>`;
}

function suggestText() {
  let best = null;
  for (const t of D.texts) {
    if (state.read[t.id]) continue;
    const cov = textCoverage(t);
    if (cov < 0.6) continue;
    const score = cov - LEVELS.indexOf(t.level) * 0.05;
    if (!best || score > best.score) best = { t, cov, score };
  }
  return best;
}

function textCoverage(t) {
  let k = 0, n = 0;
  for (const s of t.sents) for (const tok of s.tokens) {
    if (!tok.ids) continue;
    n++;
    if (tok.ids.some(id => S.isStarted(id))) k++;
  }
  return n ? k / n : 0;
}

// ----------------------------------------------------------------------------
// TRAINER
let session = null;
let pendingGrade = null; // {item, grade}

function startDaily() {
  const learning = S.learningIds();
  const fresh = S.nextNewIds(S.newLeftToday());
  const reviews = S.dueIds().slice(0, 200);
  startSession({ reviews, fresh, learning });
}
function startPractice() {
  const ids = Object.entries(state.cards).filter(([id, c]) => c.s >= 1 && D.byId.has(id))
    .sort((a, b) => (a[1].ivl || 0) - (b[1].ivl || 0)).slice(0, 60).map(([id]) => id);
  startSession({ reviews: shuffle(ids).slice(0, 20), practice: true });
}

function startSession(opts) {
  session = new S.Session(opts);
  if (!session.reviews.length && !session.fresh.length && !session.pending.length) { toast('Inget att öva just nu'); return; }
  overlay.hidden = false;
  document.body.classList.add('noscroll');
  nextCard();
}

function closeTrainer() {
  flushPending();
  stopSpeech();
  overlay.hidden = true;
  overlay.innerHTML = '';
  document.body.classList.remove('noscroll');
  session = null;
  render();
}

function flushPending() {
  if (pendingGrade && session) {
    session.answer(pendingGrade.item, pendingGrade.grade);
    pendingGrade = null;
  }
}

function trainerShell(inner, item) {
  const p = session.progress();
  const kindLabel = { intro: 'Nytt ord', mc_de_sv: 'Vad betyder ordet?', mc_sv_de: 'Välj det tyska ordet', type: 'Skriv på tyska', cloze: 'Fyll i meningen', listen: 'Lyssna och skriv' }[item.kind];
  const tag = item.relearn ? 'Repetera igen' : item.review ? (session.practice ? 'Extraövning' : 'Repetition') : item.learn ? 'Ny inlärning' : '';
  overlay.innerHTML = `
    <div class="trainer">
      <div class="t-top"><button class="icon-btn" id="t-close" aria-label="Stäng">✕</button><div class="bar t-bar"><i style="width:${pct(p)}%"></i></div><span class="muted small">${session.done}</span></div>
      <div class="t-kind"><span>${kindLabel}</span>${tag ? `<span class="chip">${tag}</span>` : ''}</div>
      <div class="t-body">${inner}</div>
    </div>`;
  $('#t-close').addEventListener('click', closeTrainer);
  bindSpeak(overlay);
}

function nextCard() {
  flushPending();
  const item = session.next();
  if (!item) return showSummary();
  const w = D.byId.get(item.id);
  if (!w) return nextCard();
  ({ intro: cardIntro, mc_de_sv: cardMC, mc_sv_de: cardMC, type: cardType, cloze: cardCloze, listen: cardListen })[item.kind](item, w);
}

function exampleHTML(w, n = 2) {
  const ex = D.examplesFor(w).filter(s => s.de.length < 110).slice(0, n);
  if (!ex.length) return '';
  return `<div class="examples">${ex.map(s => `<div class="ex"><div>${highlight(s, w)} ${speakBtn(s.de, 'sm')}</div><div class="muted">${esc(s.sv)}</div></div>`).join('')}</div>`;
}
function highlight(s, w) {
  return s.tokens.map(t => t.w ? (t.ids && t.ids.includes(w.id) ? `<mark>${esc(t.w)}</mark>` : esc(t.w)) : esc(t.p)).join('');
}

function cardIntro(item, w) {
  trainerShell(`
    <div class="center">
      <div class="prompt">${deHTML(w, 'xl')}</div>
      <div>${speakBtn(speakText(w), 'lg')}</div>
      <div class="sv-big">${esc(w.sv)}</div>
      <div class="muted">${infoHTML(w)}</div>
      ${state.notes[w.id] ? `<div class="note">💡 ${esc(state.notes[w.id])}</div>` : ''}
    </div>
    ${exampleHTML(w)}
    <div class="t-actions">
      <button class="btn ghost" id="knew">Kan redan</button>
      <button class="btn" id="cont">Fortsätt</button>
    </div>`, item);
  if (state.settings.autoSpeak) speak(speakText(w));
  S.introduce(w.id);
  $('#cont').addEventListener('click', () => { pendingGrade = { item, grade: 'correct' }; nextCard(); });
  $('#knew').addEventListener('click', () => {
    S.markKnown(w.id, 7);
    session.n++; session.done++;
    nextCard();
  });
  keyContinue(() => $('#cont').click());
}

function keyContinue(fn) {
  overlay.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); fn(); } };
  setTimeout(() => { const b = $('#cont'); b && !$('input,textarea', overlay) && b.focus({ preventScroll: true }); }, 0);
}

function distractors(w, n = 3) {
  const mine = new Set(w.svList.map(s => s.toLowerCase()));
  const ok = o => o !== w && o.pos === w.pos && o.de !== w.de && !o.svList.some(s => mine.has(s.toLowerCase()));
  const sameTopic = shuffle(D.words.filter(o => o.topic === w.topic && ok(o)));
  const sameLevel = shuffle(D.words.filter(o => o.level === w.level && ok(o))).slice(0, 30);
  const out = [];
  for (const o of [...sameTopic.slice(0, 2), ...sameLevel]) { if (out.length >= n) break; if (!out.includes(o)) out.push(o); }
  return out;
}

function cardMC(item, w) {
  const deToSv = item.kind === 'mc_de_sv';
  const opts = shuffle([w, ...distractors(w)]);
  trainerShell(`
    <div class="center">
      ${deToSv ? `<div class="prompt">${deHTML(w, 'xl')}</div>${speakBtn(speakText(w))}` : `<div class="prompt sv-prompt">${esc(w.sv)}</div><div class="muted small">${esc(w.hint || '')}</div>`}
    </div>
    <div class="options">${opts.map((o, i) => `<button class="opt" data-i="${i}">${deToSv ? esc(o.sv) : deHTML(o)}</button>`).join('')}</div>
    <div id="fb"></div>`, item);
  if (deToSv && state.settings.autoSpeak) speak(speakText(w));
  let answered = false;
  $$('.opt', overlay).forEach(b => b.addEventListener('click', () => {
    if (answered) return;
    answered = true;
    const o = opts[+b.dataset.i];
    const right = o === w;
    $$('.opt', overlay).forEach((x, i) => { if (opts[i] === w) x.classList.add('right'); });
    if (!right) b.classList.add('wrong');
    if (!deToSv && state.settings.autoSpeak) speak(speakText(w));
    pendingGrade = { item, grade: right ? 'correct' : 'wrong' };
    $('#fb').innerHTML = `
      ${right ? '' : `<div class="fb bad"><b>Rätt svar:</b> ${deHTML(w)} = ${esc(w.sv)}</div>`}
      <div class="t-actions"><button class="btn" id="cont">Fortsätt</button></div>`;
    $('#cont').addEventListener('click', nextCard);
    keyContinue(nextCard);
    if (right) setTimeout(() => { if (session && session.current === item && pendingGrade && pendingGrade.item === item) nextCard(); }, 700);
  }));
  overlay.onkeydown = e => { const n = +e.key; if (n >= 1 && n <= 4) $$('.opt', overlay)[n - 1].click(); };
}

function typeCard(item, w, { promptHTML, expectedFn, checkFn, after }) {
  trainerShell(`
    ${promptHTML}
    <form id="tform" autocomplete="off">
      <input id="ans" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" placeholder="Skriv på tyska…">
      <div id="uml"></div>
      <div class="t-actions" id="acts">
        <button type="button" class="btn ghost" id="hint">Ledtråd</button>
        <button type="button" class="btn ghost" id="dunno">Vet inte</button>
        <button type="submit" class="btn" id="check">Kontrollera</button>
      </div>
    </form>
    <div id="fb"></div>`, item);
  const input = $('#ans');
  $('#uml').appendChild(umlautBar(input));
  input.focus();
  let hints = 0;
  let done = false;
  const expected = expectedFn();
  $('#hint').addEventListener('click', () => {
    hints++;
    const show = expected.slice(0, Math.min(expected.length - 1, (w.pos === 'noun' && item.kind !== 'cloze' ? w.article.length + 1 : 0) + hints));
    input.value = show;
    input.focus();
  });
  const finish = (res) => {
    done = true;
    let grade = res.grade;
    if (hints && grade === 'correct') grade = 'almost';
    pendingGrade = { item, grade };
    input.readOnly = true;
    input.classList.add(grade === 'correct' ? 'ok' : grade === 'almost' ? 'almost' : 'bad');
    $('#acts').remove();
    $('#uml').remove();
    const title = grade === 'correct' ? '✅ Rätt!' : grade === 'almost' ? '🟡 Nästan' : '❌ Inte riktigt';
    let diffHTML = '';
    if (grade === 'almost' && input.value.trim()) diffHTML = `<div class="diff">${charDiff(input.value.trim(), res.expected || expected)}</div>`;
    else if (grade === 'wrong' && input.value.trim()) diffHTML = `<div class="diff"><span class="muted small">Ditt svar: </span><del>${esc(input.value.trim())}</del></div>`;
    $('#fb').innerHTML = `
      <div class="fb ${grade === 'correct' ? 'ok' : grade === 'almost' ? 'almost' : 'bad'}">
        <div class="fb-title">${title}</div>
        ${res.msg ? `<div>${esc(res.msg)}</div>` : ''}
        ${diffHTML}
        <div class="fb-word">${deHTML(w, 'lg')} ${speakBtn(speakText(w))}</div>
        <div>${esc(w.sv)}</div>
        <div class="muted small">${infoHTML(w)}</div>
        ${after ? after() : ''}
        ${state.notes[w.id] ? `<div class="note">💡 ${esc(state.notes[w.id])}</div>` : ''}
      </div>
      <div class="t-actions">
        ${grade !== 'correct' && input.value.trim() ? '<button class="btn ghost" id="override">Jag hade rätt</button>' : ''}
        ${grade === 'correct' && item.review && !session.practice ? '<button class="btn ghost" id="easy">För lätt</button>' : ''}
        <button class="btn" id="cont">Fortsätt</button>
      </div>`;
    bindSpeak($('#fb'));
    if (state.settings.autoSpeak) speak(item.kind === 'cloze' ? item.sentence.de : speakText(w));
    const ov = $('#override'); ov && ov.addEventListener('click', () => { pendingGrade.grade = 'correct'; nextCard(); });
    const ez = $('#easy'); ez && ez.addEventListener('click', () => { pendingGrade.grade = 'easy'; nextCard(); });
    $('#cont').addEventListener('click', nextCard);
    // keep keyboard open on iOS: Enter in the (readonly) input continues
    input.focus();
  };
  $('#tform').addEventListener('submit', e => {
    e.preventDefault();
    if (done) { nextCard(); return; }
    const v = input.value.trim();
    if (!v) { input.focus(); return; }
    const res = checkFn(v);
    if (res.grade === 'synonym') {
      $('#fb').innerHTML = `<div class="fb almost">${esc(res.msg)}</div>`;
      input.value = '';
      input.focus();
      return;
    }
    finish(res);
  });
  $('#dunno').addEventListener('click', () => { input.value = input.value || ''; finish({ grade: 'wrong', msg: '', expected }); });
  overlay.onkeydown = null;
}

function charDiff(u, e) {
  const d = diff([...u], [...e], (a, b) => fold(a) === fold(b) || a === b);
  return `<span class="muted small">Ditt svar: </span>` + d.map(p => p.t === 'same' ? esc(p.u || p.v) : p.t === 'del' ? `<del>${esc(p.v)}</del>` : `<ins>${esc(p.v)}</ins>`).join('');
}

function typeHintLine(w) {
  const bits = [];
  if (w.pos === 'noun') bits.push(state.settings.requireArticle ? 'substantiv – skriv med der/die/das' : 'substantiv');
  if (w.pos === 'verb') bits.push('verb (infinitiv)');
  if (w.hint) bits.push(esc(w.hint));
  if (w.note) bits.push(esc(w.note));
  return bits.join(' · ');
}

function cardType(item, w) {
  typeCard(item, w, {
    promptHTML: `<div class="center"><div class="prompt sv-prompt">${esc(w.sv)}</div><div class="muted small">${typeHintLine(w)}</div></div>`,
    expectedFn: () => w.answers[0],
    checkFn: v => checkWord(v, w),
    after: () => exampleHTML(w, 1),
  });
}

function cardCloze(item, w) {
  const exs = D.examplesFor(w).filter(s => s.de.length < 90);
  const s = exs[Math.floor(Math.random() * Math.min(exs.length, 4))];
  const form = s && D.formInSentence(w, s);
  if (!s || !form) { item.kind = 'type'; return cardType(item, w); }
  item.sentence = s;
  let blanked = false;
  const html = s.tokens.map(t => {
    if (t.w && !blanked && t.w === form) { blanked = true; return `<span class="blank">${'_'.repeat(Math.max(4, form.length))}</span>`; }
    return esc(t.w || t.p);
  }).join('');
  typeCard(item, w, {
    promptHTML: `<div class="cloze"><div class="cloze-de">${html}</div><div class="muted">${esc(s.sv)}</div><div class="small">Ordet: <b>${esc(w.sv)}</b></div></div>`,
    expectedFn: () => form,
    checkFn: v => {
      const fv = fold(v), ff = fold(form);
      if (v === form) return { grade: 'correct', msg: '', expected: form };
      if (fv === ff) return { grade: 'correct', msg: '', expected: form };
      if (w.answers.some(a => fold(a) === fv || fold(a.replace(/^(der|die|das) /, '')) === fv)) return { grade: 'almost', msg: `Rätt ord! Men i meningen ska det vara: ${form}`, expected: form };
      const d = lev(fv, ff);
      if (d === 1 && ff.length >= 4) return { grade: 'almost', msg: 'Nästan! Kolla stavningen.', expected: form };
      return { grade: 'wrong', msg: `Rätt: ${form}`, expected: form };
    },
    after: () => `<div class="ex"><div>${highlight(s, w)}</div></div>`,
  });
}

function cardListen(item, w) {
  typeCard(item, w, {
    promptHTML: `<div class="center"><button class="btn big round" id="replay">🔊 Lyssna</button><div class="muted small">Skriv ordet du hör${w.pos === 'noun' ? ' (med artikel)' : ''}</div></div>`,
    expectedFn: () => w.answers[0],
    checkFn: v => checkWord(v, w),
  });
  const r = $('#replay');
  r.addEventListener('click', () => { speak(speakText(w), { rate: 0.8 }); $('#ans').focus(); });
  speak(speakText(w), { rate: 0.8 });
}

function showSummary() {
  const r = session.results;
  const total = r.ok + r.bad;
  const moreNew = S.nextNewIds(5);
  overlay.innerHTML = `
    <div class="trainer">
      <div class="t-top"><button class="icon-btn" id="t-close">✕</button></div>
      <div class="t-body center">
        <div class="big-emoji">${total && r.bad / total < 0.2 ? '🏆' : '💪'}</div>
        <h2>Bra jobbat!</h2>
        <p>${total} svar · ${total ? pct(r.ok / total) : 0} % rätt</p>
        ${r.learned.length ? `<div class="card left"><h3>Nya ord inlärda (${r.learned.length})</h3><p>${r.learned.map(id => deHTML(D.byId.get(id))).join(', ')}</p><p class="muted small">De kommer tillbaka imorgon.</p></div>` : ''}
        ${r.lapsed.length ? `<div class="card left"><h3>Glömda ord (${r.lapsed.length})</h3><p>${[...new Set(r.lapsed)].map(id => deHTML(D.byId.get(id))).join(', ')}</p><p class="muted small">De kommer tillbaka snart igen.</p></div>` : ''}
        <div class="t-actions col">
          ${moreNew.length && !session.practice ? '<button class="btn ghost" id="again">Lär mig 5 nya ord till</button>' : ''}
          <button class="btn" id="done">Klar</button>
        </div>
      </div>
    </div>`;
  $('#t-close').addEventListener('click', closeTrainer);
  $('#done').addEventListener('click', closeTrainer);
  const a = $('#again'); a && a.addEventListener('click', () => { session = null; startSession({ fresh: moreNew }); });
}

// ----------------------------------------------------------------------------
// READ
let readFilter = 'all';
let showAllSv = false;
function renderRead() {
  if (sub) return renderText(D.texts.find(t => t.id === sub));
  const list = D.texts.filter(t => readFilter === 'all' || t.type === readFilter);
  view.innerHTML = `
    <header class="top"><div><h1>Läs</h1><p class="muted">Berättelser och samtal med orden från ordlistan. Tryck på ett ord för att se vad det betyder.</p></div></header>
    <div class="seg">${[['all', 'Alla'], ['story', 'Berättelser'], ['dialog', 'Samtal']].map(([k, l]) => `<button data-f="${k}" class="${readFilter === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    ${LEVELS.map(l => {
      const ts = list.filter(t => t.level === l);
      if (!ts.length) return '';
      return `<h3 class="sec">${l}</h3>` + ts.map(t => {
        const cov = textCoverage(t);
        return `<button class="card text-item" data-t="${t.id}">
          <span class="ti-icon">${t.type === 'dialog' ? '💬' : '📘'}</span>
          <span class="ti-main"><b>${esc(t.title)}</b><span class="muted">${esc(t.sv)}</span>
            <span class="bar thin"><i style="width:${pct(cov)}%"></i></span></span>
          <span class="ti-side">${state.read[t.id] ? '✅' : `<span class="small muted">${pct(cov)}%</span>`}</span>
        </button>`;
      }).join('');
    }).join('')}`;
  $$('[data-f]', view).forEach(b => b.addEventListener('click', () => { readFilter = b.dataset.f; renderRead(); }));
  $$('[data-t]', view).forEach(b => b.addEventListener('click', () => go('read', b.dataset.t)));
}

function sentenceHTML(s, si) {
  const toks = s.tokens.map((t, ti) => {
    if (!t.w) return esc(t.p);
    if (!t.ids) return `<span class="tok unk" data-s="${si}" data-k="${ti}">${esc(t.w)}</span>`;
    const st = t.ids.some(id => S.isKnown(id)) ? 'k' : t.ids.some(id => S.isStarted(id)) ? 'l' : 'n';
    return `<span class="tok ${st}" data-s="${si}" data-k="${ti}">${esc(t.w)}</span>`;
  }).join('');
  return `<span class="sent" data-si="${si}">${toks}<button class="sv-tog" data-si="${si}" aria-label="Översättning">sv</button><span class="sv-line" ${showAllSv ? '' : 'hidden'}>${esc(s.sv)}</span></span>`;
}

function renderText(t) {
  if (!t) { sub = null; return renderRead(); }
  const unknown = t.wordIds.filter(id => !S.isStarted(id));
  let si = -1;
  const body = t.type === 'dialog'
    ? (() => {
      const speakers = [];
      t.sents.forEach(s => { if (s.speaker && !speakers.includes(s.speaker)) speakers.push(s.speaker); });
      return `<div class="dialog">${t.paras.map(p => p.map(s => { si++; const side = speakers.indexOf(s.speaker) % 2 ? 'r' : 'l'; return `<div class="bubble ${side}"><div class="who">${esc(s.speaker || '')}</div>${sentenceHTML(s, si)}</div>`; }).join('')).join('<hr>')}</div>`;
    })()
    : `<div class="story">${t.paras.map(p => `<p>${p.map(s => { si++; return sentenceHTML(s, si); }).join(' ')}</p>`).join('')}</div>`;
  view.innerHTML = `
    <header class="top sticky"><button class="icon-btn" id="back">‹</button><div class="grow"><h2>${esc(t.title)}</h2><p class="muted small">${esc(t.sv)} · ${t.level}</p></div></header>
    <div class="reader-tools">
      ${canSpeak() ? '<button class="btn ghost sm" id="play">▶︎ Läs upp</button>' : ''}
      <button class="btn ghost sm" id="allsv">${showAllSv ? 'Dölj' : 'Visa'} översättning</button>
    </div>
    ${unknown.length ? `<div class="card pre-learn"><p><b>${unknown.length}</b> ord i texten har du inte börjat lära dig.</p><button class="btn sm" id="learn-words">Lär mig dem först</button> <button class="btn ghost sm" id="list-words">Visa orden</button></div>` : ''}
    <article class="reader">${body}</article>
    <p class="muted small legend"><span class="tok n">ny</span> <span class="tok l">lär mig</span> <span class="tok k">kan</span> – tryck på <b>sv</b> för översättning</p>
    <div class="btn-row">
      <button class="btn ${state.read[t.id] ? 'ghost' : ''}" id="mark">${state.read[t.id] ? '✅ Läst' : 'Markera som läst'}</button>
      <button class="btn ghost" id="practise">✍️ Skriv meningarna</button>
    </div>`;
  const sents = t.sents;
  $('#back').addEventListener('click', () => { stopSpeech(); go('read'); });
  $('#allsv').addEventListener('click', () => { showAllSv = !showAllSv; renderText(t); });
  $('#mark').addEventListener('click', () => { if (state.read[t.id]) delete state.read[t.id]; else { state.read[t.id] = today(); dayStats().xp += 5; } save(); renderText(t); });
  $('#practise').addEventListener('click', () => startSentences(sents.slice()));
  const lw = $('#learn-words');
  lw && lw.addEventListener('click', () => {
    unknown.forEach(id => S.prioritize(id));
    startSession({ fresh: unknown.slice(0, 15), reviews: [] });
  });
  const lsw = $('#list-words');
  lsw && lsw.addEventListener('click', () => openSheet(`<h3>Nya ord i texten</h3><div class="wl">${unknown.map(id => { const w = D.byId.get(id); return `<div class="wl-row">${deHTML(w)} <span class="muted">– ${esc(w.sv)}</span></div>`; }).join('')}</div>`));
  $$('.sv-tog', view).forEach(b => b.addEventListener('click', e => { e.stopPropagation(); const l = b.nextElementSibling; l.hidden = !l.hidden; }));
  $$('.tok', view).forEach(el => el.addEventListener('click', () => {
    const s = sents[+el.dataset.s];
    const tok = s.tokens[+el.dataset.k];
    tokenSheet(tok, s);
  }));
  const play = $('#play');
  play && play.addEventListener('click', () => {
    if (play.dataset.on) { stopSpeech(); play.dataset.on = ''; play.textContent = '▶︎ Läs upp'; $$('.sent.cur', view).forEach(x => x.classList.remove('cur')); return; }
    play.dataset.on = '1'; play.textContent = '■ Stoppa';
    let i = 0;
    const step = () => {
      $$('.sent.cur', view).forEach(x => x.classList.remove('cur'));
      if (!play.dataset.on || i >= sents.length || !document.body.contains(play)) { play.dataset.on = ''; play.textContent = '▶︎ Läs upp'; return; }
      const el = $(`.sent[data-si="${i}"]`, view);
      el && el.classList.add('cur');
      el && el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      speak(sents[i].de, { onend: () => { i++; setTimeout(step, 250); } });
    };
    step();
  });
}

function tokenSheet(tok, s) {
  const cands = (tok.ids || []).map(id => D.byId.get(id)).filter(Boolean).slice(0, 3);
  if (!cands.length) {
    openSheet(`<div class="ws-head"><span class="de xl">${esc(tok.w)}</span> ${speakBtn(tok.w)}</div><p class="muted">Ordet finns inte som eget ord i ordlistan (t.ex. ett namn eller en böjd form).</p><div class="ex"><div>${esc(s.de)}</div><div class="muted">${esc(s.sv)}</div></div>`);
    return;
  }
  if (cands.length === 1) return wordSheet(cands[0], `<p class="muted small">I texten: <b>${esc(tok.w)}</b></p>`);
  openSheet(`<p class="muted small">I texten: <b>${esc(tok.w)}</b> – flera möjliga ord:</p>${cands.map((w, i) => `<button class="card cand" data-i="${i}">${deHTML(w)} <span class="muted">– ${esc(w.sv)}</span> ${statusChip(w.id)}</button>`).join('')}<div class="ex"><div>${esc(s.de)}</div><div class="muted">${esc(s.sv)}</div></div>`, sh => {
    $$('.cand', sh).forEach(b => b.addEventListener('click', () => wordSheet(cands[+b.dataset.i], `<p class="muted small">I texten: <b>${esc(tok.w)}</b></p>`)));
  });
}

// ----------------------------------------------------------------------------
// WRITE (sentence translation)
function sentenceQueue(max, dueOnly = false) {
  const t = today();
  const due = [], fresh = [];
  for (const s of D.sentences) {
    const c = state.sent[s.id];
    if (c) { if (c.due <= t) due.push(s); continue; }
    if (dueOnly) continue;
    const cov = S.coverage(s);
    if (cov >= 0.85 && s.wordIds.length >= 2) fresh.push({ s, cov });
  }
  fresh.sort((a, b) => b.cov - a.cov || LEVELS.indexOf(a.s.level) - LEVELS.indexOf(b.s.level) || a.s.de.length - b.s.de.length);
  return [...shuffle(due), ...fresh.map(x => x.s)].slice(0, max);
}

function renderWrite() {
  const st = state.settings;
  const due = sentenceQueue(1000, true).length;
  const all = sentenceQueue(5000);
  const unlocked = all.length - due;
  const learnedSent = Object.keys(state.sent).length;
  view.innerHTML = `
    <header class="top"><div><h1>Skriv</h1><p class="muted">Översätt svenska meningar till tyska. Bara meningar där du redan lärt dig orden – så tränar du att <i>använda</i> dem.</p></div></header>
    <section class="grid3">
      <div class="stat"><b>${due}</b><span>att repetera</span></div>
      <div class="stat"><b>${unlocked}</b><span>nya upplåsta</span></div>
      <div class="stat"><b>${learnedSent}</b><span>övade</span></div>
    </section>
    <section class="card">
      <h3>Läge</h3>
      <div class="seg">${[['type', '⌨️ Skriv själv'], ['tiles', '🧩 Bygg med ord']].map(([k, l]) => `<button data-m="${k}" class="${st.sentenceMode === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <p class="muted small">”Bygg med ord” är lättare – bra i början. ”Skriv själv” ger bäst inlärning.</p>
      <button class="btn big wide" id="go" ${all.length ? '' : 'disabled'}>Starta (${Math.min(all.length, st.sentencesPerSession)} meningar)</button>
      ${all.length ? '' : `<p class="muted">Lär dig några ord först under <b>Idag</b> – då låses meningar upp här.</p><button class="btn ghost wide" id="easy">Öva ändå med enkla meningar</button>`}
    </section>
    <section class="card">
      <h3>Öva meningar från en text</h3>
      <p class="muted small">Öppna en text under <b>Läs</b> och tryck på <b>”Skriv meningarna”</b>.</p>
    </section>`;
  $$('[data-m]', view).forEach(b => b.addEventListener('click', () => { st.sentenceMode = b.dataset.m; save(); renderWrite(); }));
  const g = $('#go'); g && g.addEventListener('click', () => startSentences(sentenceQueue(st.sentencesPerSession)));
  const e = $('#easy'); e && e.addEventListener('click', () => startSentences(shuffle(D.sentences.filter(s => s.level === 'A1' && s.de.length < 40)).slice(0, st.sentencesPerSession)));
}

let sq = null;
function startSentences(list) {
  if (!list.length) { toast('Inga meningar'); return; }
  sq = { list: list.slice(), i: 0, ok: 0, bad: 0, retried: new Set() };
  overlay.hidden = false;
  document.body.classList.add('noscroll');
  nextSentence();
}

function nextSentence() {
  if (sq.i >= sq.list.length) return sentenceSummary();
  const s = sq.list[sq.i];
  const mode = state.settings.sentenceMode;
  const words = s.tokens.filter(t => t.ids).map(t => D.byId.get(t.ids[0])).filter(Boolean);
  const uniq = [...new Map(words.map(w => [w.id, w])).values()];
  overlay.innerHTML = `
    <div class="trainer">
      <div class="t-top"><button class="icon-btn" id="t-close">✕</button><div class="bar t-bar"><i style="width:${pct(sq.i / sq.list.length)}%"></i></div><span class="muted small">${sq.i + 1}/${sq.list.length}</span></div>
      <div class="t-kind"><span>Översätt till tyska</span><span class="chip">${s.level || ''}</span></div>
      <div class="t-body">
        <div class="prompt sv-prompt sent-prompt">${esc(s.sv)}</div>
        <div id="hintbox" class="hintbox" hidden>${shuffle(uniq.slice()).map(w => `<span class="hw">${esc(w.sv.split(',')[0])} = <b>${esc(w.pos === 'noun' ? w.de : w.de)}</b></span>`).join('')}</div>
        <div id="answer-area"></div>
        <div id="uml"></div>
        <div class="t-actions" id="acts">
          <button type="button" class="btn ghost" id="hint">Ledtråd</button>
          <button type="button" class="btn ghost" id="dunno">Visa svar</button>
          <button type="button" class="btn" id="check">Kontrollera</button>
        </div>
        <div id="fb"></div>
      </div>
    </div>`;
  $('#t-close').addEventListener('click', closeSentences);
  let usedHint = false;
  $('#hint').addEventListener('click', () => { usedHint = true; $('#hintbox').hidden = false; });
  let getValue;
  const area = $('#answer-area');
  if (mode === 'tiles') {
    const toks = sentTokens(s.de);
    const extra = shuffle(D.sentences.filter(x => x !== s && x.level === s.level)).slice(0, 2).map(x => { const tt = sentTokens(x.de); return tt[Math.floor(Math.random() * tt.length)]; }).filter(x => !toks.includes(x));
    const pool = shuffle([...toks, ...extra]).map((v, i) => ({ v, i, used: false }));
    const chosen = [];
    area.innerHTML = `<div class="tile-answer" id="ta"></div><div class="tile-pool" id="tp"></div>`;
    const draw = () => {
      $('#ta').innerHTML = chosen.map((p, k) => `<button class="tile" data-k="${k}">${esc(p.v)}</button>`).join('') || '<span class="muted small">Tryck på orden i rätt ordning</span>';
      $('#tp').innerHTML = pool.map(p => `<button class="tile ${p.used ? 'used' : ''}" data-i="${p.i}" ${p.used ? 'disabled' : ''}>${esc(p.v)}</button>`).join('');
      $$('#ta .tile').forEach(b => b.addEventListener('click', () => { if (sq.locked) return; const p = chosen.splice(+b.dataset.k, 1)[0]; p.used = false; draw(); }));
      $$('#tp .tile').forEach(b => b.addEventListener('click', () => { if (sq.locked) return; const p = pool.find(x => x.i === +b.dataset.i); p.used = true; chosen.push(p); draw(); }));
    };
    draw();
    getValue = () => chosen.map(p => p.v).join(' ');
  } else {
    area.innerHTML = `<textarea id="sans" rows="3" autocomplete="off" autocorrect="off" autocapitalize="sentences" spellcheck="false" placeholder="Skriv meningen på tyska…"></textarea>`;
    const ta = $('#sans');
    $('#uml').appendChild(umlautBar(ta));
    ta.focus();
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sq.done ? $('#cont').click() : $('#check').click(); } });
    getValue = () => ta.value;
  }
  sq.locked = false; sq.done = false;
  const finish = (res, gaveUp) => {
    sq.locked = true; sq.done = true;
    let grade = gaveUp ? 'wrong' : res.grade;
    if (usedHint && grade === 'correct') grade = 'almost';
    sq.pending = { s, grade };
    $('#acts').remove(); $('#uml').remove();
    const ta = $('#sans'); if (ta) ta.readOnly = true;
    const cls = grade === 'correct' ? 'ok' : grade === 'almost' ? 'almost' : 'bad';
    const title = grade === 'correct' ? '✅ Rätt!' : grade === 'almost' ? '🟡 Nästan' : gaveUp ? '📝 Så här blir det' : '❌ Inte riktigt';
    const diffHTML = !gaveUp && grade !== 'correct' ? `<div class="diff sent-diff">${res.parts.map(p => p.t === 'same' ? esc(p.v) : p.t === 'del' ? `<del>${esc(p.v)}</del>` : `<ins>${esc(p.v)}</ins>`).join(' ')}</div><p class="muted small"><del>överstruket</del> = fel/extra i ditt svar, <ins>grönt</ins> = saknas</p>` : '';
    $('#fb').innerHTML = `
      <div class="fb ${cls}">
        <div class="fb-title">${title}</div>
        ${res && res.msg && !gaveUp ? `<div>${esc(res.msg)}</div>` : ''}
        ${diffHTML}
        <div class="fb-sent">${esc(res ? res.ref : s.de)} ${speakBtn(res ? res.ref : s.de)}</div>
        ${s.alts && s.alts.length ? `<div class="muted small">Också rätt: ${s.alts.map(esc).join(' / ')}</div>` : ''}
        <div class="wl small">${uniq.map(w => `<span class="hw">${deHTML(w)} = ${esc(w.sv.split(',')[0])}</span>`).join('')}</div>
      </div>
      <div class="t-actions">
        ${grade !== 'correct' && !gaveUp ? '<button class="btn ghost" id="override">Jag hade rätt</button>' : ''}
        <button class="btn" id="cont">Fortsätt</button>
      </div>`;
    bindSpeak($('#fb'));
    if (state.settings.autoSpeak) speak(s.de);
    const ov = $('#override'); ov && ov.addEventListener('click', () => { sq.pending.grade = 'correct'; advanceSentence(); });
    $('#cont').addEventListener('click', advanceSentence);
    if (ta) ta.focus(); else $('#cont').focus();
    overlay.onkeydown = e => { if (e.key === 'Enter' && !ta) { e.preventDefault(); advanceSentence(); } };
  };
  $('#check').addEventListener('click', () => {
    const v = getValue().trim();
    if (!v) return;
    finish(checkSentence(v, s));
  });
  $('#dunno').addEventListener('click', () => finish({ ref: s.de, parts: [], grade: 'wrong' }, true));
  overlay.onkeydown = null;
}

function advanceSentence() {
  if (!sq.pending) return;
  const { s, grade } = sq.pending;
  sq.pending = null;
  if (!sq.retried.has(s.id)) S.gradeSentence(s.id, grade);
  if (grade === 'wrong') { sq.bad++; if (!sq.retried.has(s.id)) { sq.retried.add(s.id); sq.list.push(s); } }
  else sq.ok++;
  sq.i++;
  nextSentence();
}

function sentenceSummary() {
  overlay.innerHTML = `<div class="trainer"><div class="t-body center">
    <div class="big-emoji">✍️</div><h2>Klart!</h2>
    <p>${sq.ok} rätt · ${sq.bad} fel</p>
    <p class="muted">Meningar du klarade kommer tillbaka om några dagar, de du missade redan imorgon.</p>
    <div class="t-actions col"><button class="btn" id="done">Klar</button></div></div></div>`;
  $('#done').addEventListener('click', closeSentences);
}
function closeSentences() {
  if (sq && sq.pending) advanceSentenceSilently();
  stopSpeech();
  overlay.hidden = true; overlay.innerHTML = '';
  document.body.classList.remove('noscroll');
  sq = null;
  render();
}
function advanceSentenceSilently() { const { s, grade } = sq.pending; if (!sq.retried.has(s.id)) S.gradeSentence(s.id, grade); sq.pending = null; }

// ----------------------------------------------------------------------------
// WORDS
const wf = { q: '', status: 'all', level: 'all', topic: 'all', limit: 150 };
function renderWords() {
  const q = fold(wf.q);
  const list = D.words.filter(w => {
    if (wf.level !== 'all' && w.level !== wf.level) return false;
    if (wf.topic !== 'all' && w.topic !== wf.topic) return false;
    if (wf.status !== 'all') {
      const st = S.status(w.id);
      if (wf.status === 'started' ? st === 'new' : st !== wf.status) return false;
    }
    if (q && !fold(w.de).includes(q) && !fold(w.sv).includes(q)) return false;
    return true;
  });
  const topicsHere = D.topics.filter(t => wf.level === 'all' || t.level === wf.level);
  view.innerHTML = `
    <header class="top"><div><h1>Ordlista</h1><p class="muted">${D.words.length} ord · tryck på ett ord för detaljer</p></div></header>
    <input id="q" class="search" type="search" placeholder="Sök på tyska eller svenska…" value="${esc(wf.q)}" autocorrect="off" autocapitalize="off" spellcheck="false">
    <div class="filters">
      <select id="fl"><option value="all">Alla nivåer</option>${LEVELS.map(l => `<option ${wf.level === l ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <select id="ft"><option value="all">Alla ämnen</option>${topicsHere.map(t => `<option value="${esc(t.name)}" ${wf.topic === t.name ? 'selected' : ''}>${esc(t.name)} (${t.level})</option>`).join('')}</select>
      <select id="fs">${[['all', 'Alla'], ['new', 'Nya'], ['started', 'Påbörjade'], ['learning', 'Lär mig'], ['review', 'Repeteras'], ['mastered', 'Kan'], ['hard', 'Svåra']].map(([k, l]) => `<option value="${k}" ${wf.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
    </div>
    ${wf.topic !== 'all' ? `<div class="card topic-actions"><b>${esc(wf.topic)}</b>
      <div class="btn-row"><button class="btn sm" id="focus">${(state.settings.focusTopics || []).includes(wf.topic) ? '✓ Prioriteras' : 'Lär mig detta ämne först'}</button><button class="btn ghost sm" id="allknown">Markera alla som kända</button></div></div>` : ''}
    <p class="muted small">${list.length} ord</p>
    <div class="wordlist">${list.slice(0, wf.limit).map(w => `<button class="wrow" data-id="${esc(w.id)}"><span class="wr-de">${deHTML(w)}</span><span class="wr-sv">${esc(w.sv)}</span><span class="dot st-${S.status(w.id)}"></span></button>`).join('')}</div>
    ${list.length > wf.limit ? '<button class="btn ghost wide" id="more">Visa fler</button>' : ''}`;
  const qi = $('#q');
  let tmr;
  qi.addEventListener('input', () => { clearTimeout(tmr); tmr = setTimeout(() => { wf.q = qi.value; wf.limit = 150; renderWords(); const n = $('#q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); });
  $('#fl').addEventListener('change', e => { wf.level = e.target.value; wf.topic = 'all'; wf.limit = 150; renderWords(); });
  $('#ft').addEventListener('change', e => { wf.topic = e.target.value; wf.limit = 150; renderWords(); });
  $('#fs').addEventListener('change', e => { wf.status = e.target.value; wf.limit = 150; renderWords(); });
  const m = $('#more'); m && m.addEventListener('click', () => { wf.limit += 300; renderWords(); });
  $$('.wrow', view).forEach(b => b.addEventListener('click', () => wordSheet(D.byId.get(b.dataset.id))));
  const f = $('#focus');
  f && f.addEventListener('click', () => {
    const ft = state.settings.focusTopics || (state.settings.focusTopics = []);
    const i = ft.indexOf(wf.topic);
    if (i >= 0) ft.splice(i, 1); else ft.push(wf.topic);
    save(); renderWords();
    toast(i >= 0 ? 'Prioritering borttagen' : 'Nya ord tas från detta ämne först');
  });
  const ak = $('#allknown');
  ak && ak.addEventListener('click', () => {
    if (!confirm(`Markera alla ord i „${wf.topic}“ som kända? De repeteras om några dagar för att kontrollera.`)) return;
    list.forEach(w => { if (S.status(w.id) === 'new') S.markKnown(w.id, 5 + Math.floor(Math.random() * 6)); });
    save(); renderWords();
  });
}

// ----------------------------------------------------------------------------
// MORE: stats, settings, backup, help
function renderMore() {
  const cnt = countStatus();
  const fc = S.forecast(7);
  const maxF = Math.max(1, ...fc);
  const t = today();
  const hist = [];
  for (let d = t - 13; d <= t; d++) hist.push((state.daily[d] || {}).xp || 0);
  const maxH = Math.max(1, ...hist);
  const totals = Object.values(state.daily).reduce((a, d) => ({ ok: a.ok + (d.ok || 0), bad: a.bad + (d.bad || 0) }), { ok: 0, bad: 0 });
  const st = state.settings;
  const days = ['sö', 'må', 'ti', 'on', 'to', 'fr', 'lö'];
  const dname = off => days[new Date(Date.now() + off * 86400000).getDay()];
  view.innerHTML = `
    <header class="top"><div><h1>Statistik & inställningar</h1></div></header>
    <section class="grid3">
      <div class="stat"><b>🔥 ${streak()}</b><span>dagar i rad</span></div>
      <div class="stat"><b>${totals.ok + totals.bad ? pct(totals.ok / (totals.ok + totals.bad)) : 0}%</b><span>rätt totalt</span></div>
      <div class="stat"><b>${Object.keys(state.read).length}</b><span>texter lästa</span></div>
    </section>
    <section class="card">
      <h3>Dina ord</h3>
      <div class="stack-bar">${[['mastered', cnt.mastered], ['review', cnt.review], ['hard', cnt.hard], ['learning', cnt.learning], ['new', cnt.new]].map(([k, v]) => `<i class="st-${k}" style="flex:${v}"></i>`).join('')}</div>
      <div class="legend-grid">${[['mastered', 'Kan (≥21 d)'], ['review', 'Repeteras'], ['hard', 'Svåra'], ['learning', 'Lär mig'], ['new', 'Nya']].map(([k, l]) => `<span><i class="dot st-${k}"></i>${l}: <b>${cnt[k]}</b></span>`).join('')}</div>
    </section>
    <section class="card">
      <h3>Repetitioner kommande 7 dagar</h3>
      <div class="bars">${fc.map((v, i) => `<div class="bcol"><span class="small">${v}</span><i style="height:${(v / maxF) * 80}px"></i><span class="small muted">${i === 0 ? 'idag' : dname(i)}</span></div>`).join('')}</div>
    </section>
    <section class="card">
      <h3>Aktivitet senaste 14 dagarna</h3>
      <div class="bars">${hist.map((v, i) => `<div class="bcol"><i class="alt" style="height:${(v / maxH) * 60}px"></i><span class="small muted">${dname(i - 13)}</span></div>`).join('')}</div>
    </section>
    <section class="card settings">
      <h3>Inställningar</h3>
      <label>Nya ord per dag <span><input type="number" id="s-new" min="0" max="100" value="${st.newPerDay}"></span></label>
      <label>Dagligt mål (antal svar) <span><input type="number" id="s-goal" min="5" max="500" value="${st.dailyGoal}"></span></label>
      <label>Meningar per skrivpass <span><input type="number" id="s-sent" min="3" max="50" value="${st.sentencesPerSession}"></span></label>
      <label>Kräv artikel (der/die/das) <input type="checkbox" id="s-art" ${st.requireArticle ? 'checked' : ''}></label>
      <label>Stor bokstav måste vara rätt <input type="checkbox" id="s-case" ${st.strictCase ? 'checked' : ''}></label>
      <label>Läs upp ord automatiskt <input type="checkbox" id="s-speak" ${st.autoSpeak ? 'checked' : ''}></label>
      <label>Hörövningar <input type="checkbox" id="s-listen" ${st.listening ? 'checked' : ''}></label>
      <label>Fyll-i-meningar <input type="checkbox" id="s-cloze" ${st.cloze ? 'checked' : ''}></label>
      <label>Talhastighet <span><input type="range" id="s-rate" min="0.5" max="1.2" step="0.05" value="${st.rate}"></span></label>
      ${(st.focusTopics || []).length ? `<p class="small">Prioriterade ämnen: ${st.focusTopics.map(esc).join(', ')} <button class="btn ghost sm" id="clear-focus">Rensa</button></p>` : ''}
    </section>
    <section class="card">
      <h3>Säkerhetskopia</h3>
      <p class="muted small">Allt sparas bara på den här enheten. Gör en kopia ibland – t.ex. innan du byter telefon.</p>
      <div class="btn-row">
        <button class="btn sm" id="exp">Spara kopia (fil)</button>
        <button class="btn ghost sm" id="copy">Kopiera som text</button>
        <label class="btn ghost sm file-btn">Läs in fil<input type="file" id="imp" accept=".json,application/json,text/plain" hidden></label>
        <button class="btn ghost sm" id="paste">Klistra in text</button>
      </div>
    </section>
    <section class="card help">
      <h3>Så fungerar metoden</h3>
      <p><b>1. Lär in i flera steg.</b> Ett nytt ord visas med uttal och exempel. Sedan ska du känna igen det, välja det och till sist skriva det – med andra ord emellan, så att du måste plocka fram det ur minnet.</p>
      <p><b>2. Repetera med växande intervall.</b> Efter inlärning kommer ordet tillbaka efter 1 dag, sedan 3, ungefär 7, 18, 45 dagar osv. Varje gång du minns det växer intervallet. Glömmer du det krymper intervallet och du får skriva ordet igen i samma pass.</p>
      <p><b>3. Aktiv återkallning.</b> Repetitioner är nästan alltid att <i>skriva</i> det tyska ordet (inte bara känna igen det). Ibland i en mening, ibland efter gehör.</p>
      <p><b>4. Använd orden.</b> Läs berättelser och samtal och översätt meningar – de låses upp när du kan orden i dem.</p>
      <p><b>Ord räknas som ”kan”</b> först när de klarat ett intervall på minst ${S.MASTERED} dagar.</p>
      <p class="muted small">Färger: <span class="g-der">der</span> = maskulinum, <span class="g-die">die</span> = femininum, <span class="g-das">das</span> = neutrum.</p>
    </section>
    <section class="card">
      <button class="btn ghost danger wide" id="reset">Nollställ all data</button>
      <p class="muted small center">Version ${window.APP_VERSION || ''} · ${D.words.length} ord · ${D.texts.length} texter · ${D.sentences.length} meningar</p>
    </section>`;
  const num = (id, key, min, max) => $(id).addEventListener('change', e => { st[key] = Math.max(min, Math.min(max, parseInt(e.target.value, 10) || min)); save(); });
  num('#s-new', 'newPerDay', 0, 100);
  num('#s-goal', 'dailyGoal', 5, 500);
  num('#s-sent', 'sentencesPerSession', 3, 50);
  const chk = (id, key) => $(id).addEventListener('change', e => { st[key] = e.target.checked; save(); });
  chk('#s-art', 'requireArticle'); chk('#s-case', 'strictCase'); chk('#s-speak', 'autoSpeak'); chk('#s-listen', 'listening'); chk('#s-cloze', 'cloze');
  $('#s-rate').addEventListener('change', e => { st.rate = parseFloat(e.target.value); save(); speak('Guten Tag, wie geht es dir?'); });
  const cf = $('#clear-focus'); cf && cf.addEventListener('click', () => { st.focusTopics = []; save(); renderMore(); });
  $('#exp').addEventListener('click', async () => {
    const data = exportJSON();
    const name = `wortschatz-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([data], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Wortschatz säkerhetskopia' }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  });
  $('#copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(exportJSON()); toast('Kopierat! Spara texten t.ex. i Anteckningar.'); }
    catch (e) { prompt('Kopiera texten:', exportJSON()); }
  });
  $('#imp').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try { importJSON(await f.text()); toast('Säkerhetskopia inläst'); render(); } catch (err) { alert('Kunde inte läsa filen: ' + err.message); }
  });
  $('#paste').addEventListener('click', () => {
    openSheet(`<h3>Klistra in säkerhetskopia</h3><textarea id="pt" rows="6" placeholder="Klistra in texten här"></textarea><button class="btn wide" id="pt-ok">Läs in</button>`, sh => {
      $('#pt-ok', sh).addEventListener('click', () => {
        try { importJSON($('#pt', sh).value); closeSheet(); toast('Säkerhetskopia inläst'); render(); } catch (err) { alert('Fel: ' + err.message); }
      });
    });
  });
  $('#reset').addEventListener('click', () => { if (confirm('Vill du verkligen radera ALL din progress?') && confirm('Säker? Detta går inte att ångra.')) resetAll(); });
}

// ----------------------------------------------------------------------------
// service worker (offline)
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      nw && nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) toast('Ny version installerad – starta om appen för att använda den.', 5000);
      });
    });
  }).catch(e => console.warn('SW', e));
}

// re-render home when coming back to the app on a new day
let lastDay = today();
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && today() !== lastDay) { lastDay = today(); if (!session && !sq) render(); }
});

render();
window.__app = { D, S, state, render, get session() { return session; } };
