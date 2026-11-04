// German text-to-speech using the voices built into iOS (works offline).
import { state } from './store.js';

let voice = null;
const synth = window.speechSynthesis;

function pick() {
  if (!synth) return;
  const vs = synth.getVoices().filter(v => /^de(-|_|$)/i.test(v.lang));
  const pref = ['Anna', 'Helena', 'Petra', 'Markus', 'Yannick', 'Google Deutsch'];
  voice = vs.find(v => pref.some(p => v.name.includes(p)) && /de-DE/i.test(v.lang)) || vs.find(v => /de-DE/i.test(v.lang)) || vs[0] || null;
}
if (synth) { pick(); synth.addEventListener && synth.addEventListener('voiceschanged', pick); }

export const canSpeak = () => !!synth;

export function speak(text, { rate, onend } = {}) {
  if (!synth || !text) { onend && onend(); return; }
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, ''));
  u.lang = 'de-DE';
  if (voice) u.voice = voice;
  u.rate = rate || state.settings.rate || 0.9;
  if (onend) { u.onend = onend; u.onerror = onend; }
  synth.speak(u);
}

export function stop() { synth && synth.cancel(); }
