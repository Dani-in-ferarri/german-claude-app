# Wortschatz – 3000 tyska ord för svenskar

En app (PWA) för att lära sig tyska ord med svensk översättning. Fungerar helt **offline** på iPhone när den lagts till på hemskärmen.

- **3294 ord** (A1: 977, A2: 1191, B1: 1126) med artikel, plural och böjningsformer för starka verb
- **56 texter** – berättelser och samtal (A1–B1) som följer svensken Erik som flyttar till München. Tryck på ett ord för att se vad det betyder, tryck på *sv* för översättning av meningen, lyssna på hela texten.
- **2770 meningar** att översätta från svenska till tyska (skriv själv eller bygg med ordbrickor). 98 % av orden har minst en exempelmening.
- **Grammatik**: 30 lektioner (A1–B1) med förklaringar på svenska och 273 interaktiva övningar (flerval, luckor, ordföljd, översättning), plus snabbträning i der/die/das, plural och starka verb som genereras ur ordlistan. Lektioner du klarat kommer tillbaka för repetition.
- **Quiz**: välj nivå (A1, A2, B1 eller alla), ämne, typ av frågor och 10–100 frågor. Felen kan skickas direkt till träningen.
- **Ingen daglig gräns**: välj ett mål (t.ex. alla ord på 14 dagar), ett fast antal per dag eller fri takt. Träningen sker i omgångar om 20 nya ord – kör så många du vill.
- Uttal via iPhones inbyggda tyska röst (fungerar offline)

## Så lär du dig orden på riktigt

1. **Nytt ord** – du ser ordet, hör det och ser det i en mening.
2. **Samma pass** – du känner igen det (flerval), väljer det tyska ordet och till sist **skriver** du det själv. Med andra ord emellan, så att du måste plocka fram det ur minnet.
3. **Repetition med växande intervall** – 1 dag, 3 dagar, ~8, ~20, ~50 … Gör du fel krymper intervallet och du får skriva ordet igen i samma pass. Ord du glömmer om och om igen hamnar under ”Svåra ord”.
4. **Aktiv återkallning** – repetitionerna är att *skriva* det tyska ordet: ibland fristående, ibland i en lucka i en mening, ibland efter gehör.
5. **Använd orden** – texter och meningar låses upp när du kan orden i dem.

Ett ord räknas som ”kan” först när det klarat ett intervall på minst 21 dagar.

## Installera på iPhone

Appen behöver ligga på en webbadress en gång, sedan fungerar den utan internet.

1. Öppna appens adress i **Safari** på iPhonen (inte Chrome).
2. Tryck på **Dela**-knappen (fyrkanten med pil uppåt).
3. Välj **”Lägg till på hemskärmen”** → **Lägg till**.
4. Öppna appen från hemskärmen **en gång medan du har internet** – då sparas allt i telefonen.
5. Klart. Nu fungerar den i flygplansläge.

Din progress sparas bara i telefonen. Under **Mer → Säkerhetskopia** kan du spara en kopia som fil.

### Publicera adressen (GitHub Pages)

Repot har ett färdigt arbetsflöde (`.github/workflows/pages.yml`) som publicerar appen vid varje push till `main`.

1. Slå ihop grenen med `main`.
2. GitHub Pages för **privata** repon kräver GitHub Pro. Antingen gör du repot publikt (*Settings → General → Change visibility*), eller så använder du ett annat gratisalternativ nedan.
3. *Settings → Pages → Build and deployment → Source:* välj **GitHub Actions**.
4. Efter någon minut finns appen på `https://<användarnamn>.github.io/german-claude-app/`.

**Alternativ utan GitHub Pages:** dra mappen med filerna till [Netlify Drop](https://app.netlify.com/drop) (gratis konto) eller Cloudflare Pages – du får en adress som du öppnar på iPhonen enligt ovan.

## Utveckling

Ingen byggprocess – bara statiska filer.

```bash
python3 -m http.server 8000     # öppna http://localhost:8000
node tools/check-data.mjs       # kontrollera ordlista och texter (antal, dubbletter, täckning)
node tools/check-data.mjs --uncovered B1   # ord som saknar exempelmening
python3 tools/dedupe.py         # ta bort dubbletter i ordlistorna
```

- `data/words-*.js` – ordlistan: `tyska | svenska`. Substantiv med artikel och plural (`der Tisch, -e`), verb har svensk översättning som börjar med ”att”, starka verb har tidsformer i parentes.
- `data/texts-*.js` – berättelser och samtal, en mening per rad: `tyska = svenska`.
- `data/sentences.js` – övningsmeningar.
- `data/grammar*.js` – grammatiklektioner och övningar.
- `js/grammar.js` – grammatik och övningsmotor, `js/quiz.js` – quiz, `js/srs.js` – repetitionsschemat, `js/check.js` – rättning av svar, `js/data.js` – tolkning och koppling av böjda ord till ordlistan.

**Viktigt vid ändringar:** höj `VERSION` i `sw.js`, annars fortsätter installerade appar att använda den gamla cachen.
