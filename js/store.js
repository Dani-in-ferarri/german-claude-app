// Persistence of all progress in localStorage (+ export/import as JSON).
const KEY = 'wortschatz-v1';

export const DEFAULT_SETTINGS = {
  pace: 'goal',         // 'goal' (all words in N days) | 'fixed' (N new words/day) | 'free' (no plan)
  goalDays: 14,
  goalStart: null,       // day index when the plan started
  roundSize: 20,         // new words per round
  newPerDay: 50,
  requireArticle: true,
  strictCase: false,
  autoSpeak: true,
  rate: 0.9,
  listening: true,
  cloze: true,
  focusTopics: [],      // topic names to take new words from first
  sentenceMode: 'type', // 'type' | 'tiles'
  sentencesPerSession: 20,
  dailyGoal: 50,        // answered exercises per day
};

export const state = {
  cards: {},     // wordId -> card
  sent: {},      // sentenceId -> {ivl, due, reps, lapses}
  daily: {},     // day -> {new, rev, ok, bad, sent, xp}
  read: {},      // textId -> day read
  notes: {},     // wordId -> text
  grammar: {},   // lessonId -> {ivl, due, best, last, n}
  quiz: [],      // [{d, level, n, score}]
  settings: { ...DEFAULT_SETTINGS },
  created: Date.now(),
  onboarded: false,
};

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      Object.assign(state, d);
      state.settings = { ...DEFAULT_SETTINGS, ...(d.settings || {}) };
      // migrate v1 settings: no daily limit any more, plan "all words in 14 days"
      if (!d.settings || !d.settings.pace) {
        state.settings.pace = 'goal';
        state.settings.goalDays = 14;
        state.settings.goalStart = null;
        state.settings.sentencesPerSession = 20;
      }
    }
    state.grammar = state.grammar || {};
    state.quiz = state.quiz || [];
    if (state.settings.goalStart == null) state.settings.goalStart = today();
  } catch (e) { console.warn('load failed', e); }
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { /* ignore */ }
}

let saveTimer = null;
export function save(now) {
  clearTimeout(saveTimer);
  const doSave = () => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { console.warn('save failed', e); }
  };
  if (now) doSave(); else saveTimer = setTimeout(doSave, 300);
}
window.addEventListener('pagehide', () => save(true));
document.addEventListener('visibilitychange', () => { if (document.hidden) save(true); });

export function exportJSON() {
  return JSON.stringify({ app: 'wortschatz', v: 1, exported: new Date().toISOString(), state });
}

export function importJSON(text) {
  const d = JSON.parse(text);
  const s = d.state || d;
  if (!s.cards) throw new Error('Ingen giltig säkerhetskopia');
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, { cards: {}, sent: {}, daily: {}, read: {}, notes: {}, grammar: {}, quiz: [], created: Date.now(), onboarded: true }, s);
  state.settings = { ...DEFAULT_SETTINGS, ...(s.settings || {}) };
  save(true);
}

export function resetAll() {
  localStorage.removeItem(KEY);
  location.reload();
}

// Day index with a 4 a.m. cut-off, in local time.
export function today() {
  const now = Date.now();
  const off = new Date(now).getTimezoneOffset() * 60000;
  return Math.floor((now - off - 4 * 3600000) / 86400000);
}

export function dayStats(d = today()) {
  return state.daily[d] || (state.daily[d] = { new: 0, rev: 0, ok: 0, bad: 0, sent: 0, xp: 0 });
}

export function streak() {
  let d = today();
  let n = 0;
  const active = x => state.daily[x] && state.daily[x].xp > 0;
  if (!active(d)) d -= 1; // today not done yet: streak still counts from yesterday
  while (active(d)) { n++; d--; }
  return n;
}
