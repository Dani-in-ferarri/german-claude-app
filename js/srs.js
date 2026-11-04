// Spaced repetition. Every word walks through several exercise types in the
// first session (recognize -> choose -> write), then comes back after growing
// intervals (1, 3, ~7, ~18, ~45 days ...). A mistake shrinks the interval and
// the word has to be written correctly again in the same session.
import { state, today, dayStats, save } from './store.js';
import { words, byId, examplesFor } from './data.js';

export const LEARN_STEPS = ['mc_de_sv', 'mc_sv_de', 'type'];
export const MASTERED = 21; // days

export function card(id) { return state.cards[id]; }

export function status(id) {
  const c = state.cards[id];
  if (!c || c.s === 0) return 'new';
  if (c.s === 1) return 'learning';
  if (c.leech && c.ivl < MASTERED) return 'hard';
  if (c.ivl >= MASTERED) return 'mastered';
  return 'review';
}
export const isKnown = id => { const c = state.cards[id]; return !!c && c.s === 2; };
export const isStarted = id => { const c = state.cards[id]; return !!c && c.s >= 1; };

function fresh() { return { s: 1, step: 0, ivl: 0, ease: 2.5, due: today(), reps: 0, lapses: 0, ok: 0, bad: 0, intro: today() }; }

export function introduce(id) {
  const c = state.cards[id] = { ...(state.cards[id] || {}), ...fresh() };
  dayStats().new++;
  return c;
}

export function markKnown(id, ivl = 10) {
  const c = state.cards[id] || (state.cards[id] = fresh());
  Object.assign(c, { s: 2, step: 0, ivl, due: today() + ivl, known: true });
  save();
}

export function resetCard(id) { delete state.cards[id]; save(); }

export function prioritize(id) {
  const c = state.cards[id];
  if (c && c.s >= 1) return false;
  state.cards[id] = { s: 0, prio: Date.now() };
  save();
  return true;
}

function fuzz(ivl) {
  if (ivl < 4) return ivl;
  const f = 1 + (Math.random() * 0.1 - 0.05);
  return Math.round(ivl * f);
}

// grade: 'wrong' | 'almost' | 'correct' | 'easy'
export function gradeReview(c, grade) {
  const t = today();
  c.reps++;
  c.last = t;
  if (grade === 'wrong') {
    c.lapses++;
    c.bad++;
    c.ease = Math.max(1.3, c.ease - 0.2);
    c.ivl = Math.max(1, Math.round(c.ivl * 0.3));
    c.due = t;
    c.relearn = true;
    if (c.lapses >= 4) c.leech = true;
    return;
  }
  c.ok++;
  const late = Math.max(0, t - c.due);
  let ivl;
  if (c.relearn) {
    ivl = Math.max(1, c.ivl);
    c.relearn = false;
  } else if (grade === 'almost') {
    ivl = Math.max(c.ivl + 1, Math.round((c.ivl + late / 4) * 1.2));
    c.ease = Math.max(1.3, c.ease - 0.15);
  } else if (grade === 'easy') {
    ivl = Math.round((Math.max(c.ivl, 1) + late) * c.ease * 1.3);
    c.ease = Math.min(3.2, c.ease + 0.15);
  } else {
    ivl = c.ivl <= 1 ? 3 : Math.round((c.ivl + late / 2) * c.ease);
  }
  ivl = Math.min(365, Math.max(1, fuzz(ivl)));
  c.ivl = ivl;
  c.due = t + ivl;
  if (c.leech && c.ivl >= MASTERED) c.leech = false;
}

export function graduate(c) {
  c.s = 2; c.step = 0; c.ivl = 1; c.due = today() + 1; c.reps++; c.ok++; c.last = today();
}

// --- choosing what to study -------------------------------------------------
export function dueIds() {
  const t = today();
  const out = [];
  for (const [id, c] of Object.entries(state.cards)) if (c.s === 2 && c.due <= t && byId.has(id)) out.push(id);
  // most overdue (relative to interval) first
  out.sort((a, b) => {
    const ca = state.cards[a], cb = state.cards[b];
    return (ca.due - t) / Math.max(1, ca.ivl) - (cb.due - t) / Math.max(1, cb.ivl);
  });
  return out;
}

export function learningIds() {
  return Object.entries(state.cards).filter(([id, c]) => c.s === 1 && byId.has(id)).map(([id]) => id);
}

export function nextNewIds(n) {
  if (n <= 0) return [];
  const prio = Object.entries(state.cards).filter(([id, c]) => c.s === 0 && c.prio && byId.has(id))
    .sort((a, b) => a[1].prio - b[1].prio).map(([id]) => id);
  const out = prio.slice(0, n);
  const focus = state.settings.focusTopics || [];
  const pick = list => {
    for (const w of list) {
      if (out.length >= n) break;
      const c = state.cards[w.id];
      if ((!c || c.s === 0) && !out.includes(w.id)) out.push(w.id);
    }
  };
  if (focus.length) pick(words.filter(w => focus.includes(w.topic)));
  pick(words);
  return out;
}

export function newLeftToday() {
  return Math.max(0, state.settings.newPerDay - dayStats().new);
}

export function forecast(days = 7) {
  const t = today();
  const arr = new Array(days).fill(0);
  for (const c of Object.values(state.cards)) {
    if (c.s !== 2) continue;
    const d = Math.max(0, c.due - t);
    if (d < days) arr[d]++;
  }
  return arr;
}

// pick an exercise type for a review card
export function reviewKind(id) {
  const c = state.cards[id];
  const w = byId.get(id);
  if (c.relearn || c.ivl < 3) return 'type';
  const r = Math.random();
  const s = state.settings;
  const hasEx = examplesFor(w).some(x => x.de.length < 90);
  if (s.cloze && hasEx && r < 0.3) return 'cloze';
  if (s.listening && r > 0.82 && window.speechSynthesis) return 'listen';
  return 'type';
}

// ---- Session: a queue mixing reviews, new words and in-session repeats -----
export class Session {
  constructor({ reviews = [], fresh = [], learning = [], practice = false, maxActive = 4 }) {
    this.reviews = reviews.slice();
    this.fresh = fresh.slice();
    this.pending = learning.map((id, i) => ({ id, kind: LEARN_STEPS[state.cards[id].step] || 'type', at: i, learn: true }));
    this.practice = practice;
    this.maxActive = maxActive;
    this.n = 0;
    this.sinceNew = 0;
    this.lastId = null;
    this.results = { ok: 0, bad: 0, learned: [], lapsed: [], newSeen: [] };
    this.total = this.reviews.length + this.fresh.length * 4 + this.pending.length;
    this.done = 0;
  }

  activeLearning() { return this.pending.filter(p => p.learn).length; }

  next() {
    const ready = this.pending.filter(p => p.at <= this.n && p.id !== this.lastId).sort((a, b) => a.at - b.at);
    let item = null;
    if (ready.length) {
      item = ready[0];
      this.pending.splice(this.pending.indexOf(item), 1);
    } else if (this.fresh.length && this.activeLearning() < this.maxActive && (this.sinceNew >= 2 || !this.reviews.length)) {
      const id = this.fresh.shift();
      this.sinceNew = 0;
      item = { id, kind: 'intro', learn: true };
    } else if (this.reviews.length) {
      const id = this.reviews.shift();
      this.sinceNew++;
      item = { id, kind: this.practice ? 'type' : reviewKind(id), review: true };
    } else if (this.fresh.length) {
      const id = this.fresh.shift();
      item = { id, kind: 'intro', learn: true };
    } else if (this.pending.length) {
      this.pending.sort((a, b) => a.at - b.at);
      item = this.pending.find(p => p.id !== this.lastId) || this.pending[0];
      this.pending.splice(this.pending.indexOf(item), 1);
    }
    if (item) this.lastId = item.id;
    this.current = item;
    return item;
  }

  requeue(item, gap) {
    this.pending.push({ ...item, at: this.n + gap });
  }

  progress() {
    const left = this.reviews.length + this.fresh.length * 4 + this.pending.reduce((a, p) => a + (p.learn ? LEARN_STEPS.length - LEARN_STEPS.indexOf(p.kind) : 1), 0);
    return this.done / Math.max(1, this.done + left);
  }

  // Called after the user answered. grade: wrong|almost|correct|easy
  answer(item, grade) {
    this.n++;
    this.done++;
    const ds = dayStats();
    ds.xp++;
    const c = state.cards[item.id];
    if (item.kind === 'intro') {
      this.results.newSeen.push(item.id);
      this.requeue({ id: item.id, kind: LEARN_STEPS[0], learn: true }, 1);
      save();
      return;
    }
    if (grade === 'wrong') { this.results.bad++; ds.bad++; } else { this.results.ok++; ds.ok++; }

    if (this.practice) {
      if (grade === 'wrong') this.requeue({ ...item, review: false }, 3);
      save();
      return;
    }

    if (item.learn || (c && c.s === 1)) {
      const stepIdx = LEARN_STEPS.indexOf(item.kind);
      if (grade === 'wrong' || (grade === 'almost' && item.kind === 'type')) {
        c.bad += grade === 'wrong' ? 1 : 0;
        const back = grade === 'wrong' && item.kind === 'type' ? 'mc_sv_de' : item.kind;
        c.step = Math.max(0, LEARN_STEPS.indexOf(back));
        this.requeue({ id: item.id, kind: back, learn: true, retry: true }, 2);
        // after a wrong "choose", still require writing later
      } else if (stepIdx < LEARN_STEPS.length - 1) {
        c.step = stepIdx + 1;
        c.ok++;
        this.requeue({ id: item.id, kind: LEARN_STEPS[stepIdx + 1], learn: true }, stepIdx === 0 ? 2 : 4);
      } else {
        graduate(c);
        this.results.learned.push(item.id);
      }
      save();
      return;
    }

    // review card
    ds.rev++;
    gradeReview(c, grade);
    if (grade === 'wrong') {
      this.results.lapsed.push(item.id);
      this.requeue({ id: item.id, kind: 'type', relearn: true }, 3);
    }
    save();
  }
}

// ---- sentences ---------------------------------------------------------------
export function sentCard(id) { return state.sent[id]; }

export function gradeSentence(id, grade) {
  const t = today();
  const c = state.sent[id] || (state.sent[id] = { ivl: 0, due: t, reps: 0, lapses: 0 });
  c.reps++;
  c.last = t;
  if (grade === 'wrong') { c.lapses++; c.ivl = 0; c.due = t + 1; }
  else if (grade === 'almost') { c.ivl = Math.max(1, Math.round(c.ivl * 1.2)); c.due = t + c.ivl; }
  else { c.ivl = c.ivl ? Math.round(c.ivl * 2.5) : 3; c.ivl = Math.min(c.ivl, 365); c.due = t + c.ivl; }
  const ds = dayStats();
  ds.sent++; ds.xp++;
  if (grade === 'wrong') ds.bad++; else ds.ok++;
  save();
}

// share of the linked words in a sentence the user has started learning
export function coverage(s, strict = false) {
  if (!s.wordIds.length) return 1;
  let k = 0;
  for (const t of s.tokens) {
    if (!t.ids) continue;
    if (t.ids.some(id => (strict ? isKnown(id) : isStarted(id)))) k++;
  }
  const linked = s.tokens.filter(t => t.ids).length;
  return linked ? k / linked : 1;
}
