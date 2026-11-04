# Removes later entries whose German answer already exists (unless the first one is
# deliberately disambiguated with a [hint], e.g. sie [hon] / sie [de]).
import re, sys, glob
seen = {}
KEEP = {'sein (ist, war, ist gewesen)'}
for p in sorted(glob.glob('data/words-*.js'), key=lambda x: ['a1','a2','b1','b1x'].index(re.search(r'words-(\w+)', x).group(1))):
    out, removed = [], []
    for line in open(p, encoding='utf8').read().split('\n'):
        t = line.strip()
        if '|' not in t or t.startswith('(') or t.startswith('#') or t.startswith('//'):
            out.append(line); continue
        raw = t.split('|')[0].strip()
        hint = re.search(r'\[(.+?)\]', raw)
        de = re.sub(r'\s*\[.*?\]\s*', ' ', raw).strip()
        de = re.sub(r'\s*\(.*\)$', '', de)
        de = re.sub(r',\s*[^,]*$', '', de) if re.match(r'^(der|die|das) ', de) else de
        de = de.strip()
        if de in seen and not (seen[de] and hint) and raw not in KEEP:
            removed.append(raw); continue
        if de not in seen: seen[de] = bool(hint)
        out.append(line)
    open(p, 'w', encoding='utf8').write('\n'.join(out))
    print(p, 'removed', len(removed), removed if '-v' in sys.argv else '')
