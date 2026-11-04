// Grammatiklektioner. text: förklaring (## rubrik, - punkt, | tabell |, > tyska = svenska, **fet**)
// ex: övningar, en per rad:
//   ? fråga med ___ | rätt svar | fel1, fel2 = svensk översättning      (flerval)
//   _ fråga med ___ (ledtråd) | svar/alternativ = svensk översättning   (skriv i luckan)
//   ~ tysk mening = svensk översättning                                 (sätt orden i ordning)
//   > svensk mening = tysk mening | alternativ                          (översätt)
// auto: 'gender' | 'plural' | 'verbs' lägger till genererade övningar från ordlistan
(window.GRAMMAR = window.GRAMMAR || []).push(
{ id: 'g-a1-genus', level: 'A1', title: 'Der, die, das – genus', sv: 'Substantivens tre genus', auto: 'gender', text: `
Tyskan har **tre genus**: maskulinum (**der**), femininum (**die**) och neutrum (**das**). Svenskans en/ett hjälper tyvärr inte – lär dig därför alltid ordet **tillsammans med artikeln**.
> der Tisch, die Lampe, das Buch = bordet, lampan, boken
## Bestämd och obestämd artikel
| | maskulinum | femininum | neutrum | plural |
| bestämd | der | die | das | die |
| obestämd | ein | eine | ein | – |
## Regler som hjälper
- **die**: ord på -ung, -heit, -keit, -schaft, -ion, -tät, -ie, de flesta på -e (die Zeitung, die Freiheit, die Information, die Lampe)
- **das**: ord på -chen och -lein (das Mädchen), de flesta på -ment, -um (das Museum), substantiverade verb (das Essen)
- **der**: veckodagar, månader, årstider (der Montag, der Mai, der Sommer), ord på -ling, -ismus, män och yrken (der Lehrer)
- **Sammansatta ord** får genus från sista delen: das Haus + die Tür → **die** Haustür
Tips: I appen är der blå, die röd och das grön – försök se färgen framför dig.
`, ex: `
? ___ Zeitung | die | der, das = tidningen
? ___ Mädchen | das | der, die = flickan
? ___ Montag | der | die, das = måndagen
? ___ Information | die | der, das = informationen
? ___ Kindergarten | der | die, das = förskolan
? ___ Haustür | die | der, das = ytterdörren
? Das ist ___ Hund. | ein | eine, einen = Det är en hund.
? Das ist ___ Katze. | eine | ein, einer = Det är en katt.
? Das ist ___ Haus. | ein | eine, einen = Det är ett hus.
? ___ Freiheit | die | der, das = friheten
`},
{ id: 'g-a1-plural', level: 'A1', title: 'Plural', sv: 'Hur substantiv bildar plural', auto: 'plural', text: `
I plural är den bestämda artikeln alltid **die** – oavsett genus. Själva ordet får olika ändelser, och därför bör du lära dig pluralen tillsammans med ordet (i ordlistan står den efter kommatecknet).
| Ändelse | Exempel |
| -e | der Tag → die Tage |
| ¨-e (omljud + e) | die Stadt → die Städte |
| -er / ¨-er | das Kind → die Kinder, das Buch → die Bücher |
| -(e)n | die Lampe → die Lampen, die Frau → die Frauen |
| -nen | die Lehrerin → die Lehrerinnen |
| -s | das Auto → die Autos |
| - (ingen ändring) | der Lehrer → die Lehrer, das Zimmer → die Zimmer |
## Tumregler
- De flesta **feminina** ord får **-(e)n**: die Blume → die Blumen
- Ord på **-er, -el, -en** (der/das) ändras ofta inte alls: der Koffer → die Koffer
- Lånord och ord på vokal får ofta **-s**: das Hotel → die Hotels, das Handy → die Handys
- **¨** betyder omljud: a → ä, o → ö, u → ü, au → äu
`, ex: `
_ das Kind → die ___ | Kinder = barnen
_ die Frau → die ___ | Frauen = kvinnorna
_ das Auto → die ___ | Autos = bilarna
_ der Tag → die ___ | Tage = dagarna
_ die Lehrerin → die ___ | Lehrerinnen = lärarinnorna
? Ich habe zwei ___. | Brüder | Bruder, Bruders = Jag har två bröder.
? Die ___ sind sehr alt. | Häuser | Haus, Hause = Husen är mycket gamla.
? Wir kaufen drei ___. | Äpfel | Apfel, Apfels = Vi köper tre äpplen.
`},
{ id: 'g-a1-presens', level: 'A1', title: 'Verb i presens', sv: 'ich wohne, du wohnst …', text: `
Tyska verb böjs efter **person**. Ta bort **-en** från infinitiven och lägg till ändelsen:
| Person | Ändelse | wohnen (bo) | arbeiten (arbeta) |
| ich (jag) | -e | wohne | arbeite |
| du (du) | -st | wohnst | arbeitest |
| er/sie/es (han/hon/den) | -t | wohnt | arbeitet |
| wir (vi) | -en | wohnen | arbeiten |
| ihr (ni) | -t | wohnt | arbeitet |
| sie/Sie (de/Ni) | -en | wohnen | arbeiten |
- Om stammen slutar på **-t** eller **-d** läggs ett **e** in: du arbeit**e**st, er find**e**t
- Om stammen slutar på **-s, -ß, -z** blir du-formen bara **-t**: du heißt, du tanzt
- **Sie** med stor bokstav är artigt tilltal (Ni) och böjs som "de"
> Ich wohne in Göteborg. = Jag bor i Göteborg.
> Wo wohnst du? = Var bor du?
> Sie arbeitet bei einer Bank. = Hon arbetar på en bank.
`, ex: `
_ Ich ___ (wohnen) in München. | wohne = Jag bor i München.
_ Du ___ (spielen) gut Gitarre. | spielst = Du spelar gitarr bra.
_ Er ___ (arbeiten) im Büro. | arbeitet = Han arbetar på kontoret.
_ Wir ___ (lernen) Deutsch. | lernen = Vi lär oss tyska.
_ Ihr ___ (kommen) aus Schweden. | kommt = Ni kommer från Sverige.
_ Wie ___ (heißen) du? | heißt = Vad heter du?
? Sie ___ jeden Tag Kaffee. (hon) | trinkt | trinke, trinken = Hon dricker kaffe varje dag.
? Woher ___ Sie, Herr Weber? | kommen | kommt, kommst = Varifrån kommer Ni, herr Weber?
? Du ___ sehr schnell. | redest | redst, redet = Du pratar väldigt snabbt.
> Jag bor i Berlin. = Ich wohne in Berlin.
`},
{ id: 'g-a1-sein-haben', level: 'A1', title: 'Sein och haben', sv: 'Att vara och att ha', text: `
De två viktigaste verben är oregelbundna – lär dig dem utantill:
| | sein (vara) | haben (ha) |
| ich | bin | habe |
| du | bist | hast |
| er/sie/es | ist | hat |
| wir | sind | haben |
| ihr | seid | habt |
| sie/Sie | sind | haben |
> Ich bin müde. = Jag är trött.
> Hast du Zeit? = Har du tid?
## Skillnad mot svenskan
- Hunger och törst "har" man: **Ich habe Hunger.** = Jag är hungrig.
- Ålder: **Ich bin dreißig (Jahre alt).** = Jag är trettio (år).
- Rätt/fel: **Du hast recht.** = Du har rätt.
`, ex: `
? Ich ___ Lehrerin. | bin | ist, habe = Jag är lärare.
? Wir ___ zwei Kinder. | haben | sind, hat = Vi har två barn.
? ___ du müde? | Bist | Ist, Hast = Är du trött?
? Er ___ keine Zeit. | hat | ist, habt = Han har inte tid.
? Ihr ___ sehr nett. | seid | sind, habt = Ni är mycket trevliga.
_ Ich ___ (haben) Hunger. | habe = Jag är hungrig.
_ Das Wetter ___ (sein) schön. | ist = Vädret är fint.
_ ___ (haben) Sie einen Moment Zeit? | Haben = Har Ni ett ögonblick?
> Jag är hungrig. = Ich habe Hunger.
> Hon är trettio år gammal. = Sie ist dreißig Jahre alt.
`},
{ id: 'g-a1-ordfoljd', level: 'A1', title: 'Ordföljd: verbet på plats 2', sv: 'Huvudsatser och frågor', text: `
Precis som i svenskan står **verbet alltid på plats 2** i en huvudsats. Börjar du med något annat än subjektet byter subjekt och verb plats (inversion):
> Ich gehe heute ins Kino. = Jag går på bio i dag.
> Heute gehe ich ins Kino. = I dag går jag på bio.
## Frågor
- **Frågeord** först, sedan verbet: **Wo wohnst du?** = Var bor du?
- **Ja/nej-frågor**: verbet först: **Kommst du mit?** = Följer du med?
## Frågeord
| was | vad | wo | var |
| wer | vem | wohin | vart |
| wann | när | woher | varifrån |
| warum | varför | wie | hur |
## Tid – sätt – plats
Om flera bestämningar kommer efter verbet är ordningen oftast **tid → sätt → plats**:
> Ich fahre morgen mit dem Zug nach Berlin. = Jag åker tåg till Berlin i morgon.
`, ex: `
~ Heute gehe ich ins Kino. = I dag går jag på bio.
~ Wo wohnst du? = Var bor du?
~ Kommst du morgen mit? = Följer du med i morgon?
~ Am Montag arbeite ich nicht. = På måndag arbetar jag inte.
~ Ich fahre morgen mit dem Zug nach Berlin. = Jag åker tåg till Berlin i morgon.
? Morgen ___ nach Hause. | fahre ich | ich fahre, fahren ich = I morgon åker jag hem.
? ___ du Kaffee? | Trinkst | Du trinkst, Trinken = Dricker du kaffe?
? Warum ___ so müde? | bist du | du bist, ist du = Varför är du så trött?
> Var bor du? = Wo wohnst du?
> I dag arbetar jag hemma. = Heute arbeite ich zu Hause.
`},
{ id: 'g-a1-negation', level: 'A1', title: 'Negation: nicht och kein', sv: 'Att säga "inte" och "ingen"', text: `
Tyskan har två sätt att säga nej:
- **kein** (ingen/inget/inga) används framför substantiv med **ein** eller **utan artikel**
- **nicht** (inte) används i alla andra fall: verb, adjektiv, substantiv med bestämd artikel, namn
> Ich habe ein Auto. → Ich habe kein Auto. = Jag har ingen bil.
> Ich trinke Kaffee. → Ich trinke keinen Kaffee. = Jag dricker inget kaffe.
> Das Essen ist nicht gut. = Maten är inte god.
> Ich kenne den Mann nicht. = Jag känner inte mannen.
## kein böjs som ein
| | mask. | fem. | neutr. | plural |
| nominativ | kein | keine | kein | keine |
| ackusativ | keinen | keine | kein | keine |
## Var står nicht?
- Hela satsen negeras: **nicht** står ofta sist: Ich komme heute **nicht**.
- Framför adjektiv och platsangivelser: Er ist **nicht** müde. Ich wohne **nicht** in Berlin.
`, ex: `
? Ich habe ___ Zeit. | keine | nicht, kein = Jag har ingen tid.
? Das ist ___ richtig. | nicht | kein, keine = Det är inte rätt.
? Er hat ___ Bruder. | keinen | nicht, keine = Han har ingen bror.
? Wir kommen heute ___. | nicht | kein, keine = Vi kommer inte i dag.
? Das ist ___ Problem. | kein | nicht, keine = Det är inget problem.
? Ich trinke ___ Bier. | kein | keinen, nicht = Jag dricker ingen öl.
_ Ich habe ___ Hunger. (ingen) | keinen = Jag är inte hungrig.
> Jag har ingen bil. = Ich habe kein Auto.
> Han kommer inte. = Er kommt nicht.
`},
{ id: 'g-a1-akkusativ', level: 'A1', title: 'Ackusativ', sv: 'Objektet: den, einen …', text: `
Det som verbet riktar sig mot (objektet) står i **ackusativ**. Den goda nyheten: **bara maskulinum ändras**!
| | mask. | fem. | neutr. | plural |
| nominativ (subjekt) | der / ein | die / eine | das / ein | die |
| ackusativ (objekt) | **den / einen** | die / eine | das / ein | die |
> Der Hund ist groß. = Hunden är stor. (subjekt)
> Ich sehe den Hund. = Jag ser hunden. (objekt)
> Ich habe einen Bruder. = Jag har en bror.
## Verb som tar ackusativ
haben, sehen, kaufen, brauchen, suchen, essen, trinken, nehmen, besuchen, lieben – och uttrycket **es gibt** (det finns): Es gibt **einen** Park.
## Pronomen
| ich → mich | du → dich | er → ihn | sie → sie | es → es | wir → uns | ihr → euch | Sie → Sie |
> Ich liebe dich. = Jag älskar dig.
`, ex: `
? Ich kaufe ___ Tisch. | einen | ein, eine = Jag köper ett bord.
? Wir besuchen ___ Großvater. | den | der, dem = Vi hälsar på farfar.
? Sie trinkt ___ Kaffee. | einen | ein, eine = Hon dricker en kaffe.
? Er liest ___ Buch. | das | den, der = Han läser boken.
? Ich sehe ___ Frau. | die | den, der = Jag ser kvinnan.
? Hier gibt es ___ Supermarkt. | einen | ein, der = Här finns en mataffär.
? Kennst du ___? (honom) | ihn | er, ihm = Känner du honom?
? Ich liebe ___. (dig) | dich | du, dir = Jag älskar dig.
_ Ich brauche ___ (en) Löffel. | einen = Jag behöver en sked.
> Jag har en bror. = Ich habe einen Bruder.
`},
{ id: 'g-a1-possessiv', level: 'A1', title: 'Possessiva pronomen', sv: 'mein, dein, sein, ihr …', text: `
| ich | mein (min) | wir | unser (vår) |
| du | dein (din) | ihr | euer (er) |
| er/es | sein (hans) | sie | ihr (deras) |
| sie | ihr (hennes) | Sie | Ihr (Er, artigt) |
Possessiva pronomen får **samma ändelser som ein/kein**:
> mein Vater, meine Mutter, mein Kind, meine Eltern = min pappa, min mamma, mitt barn, mina föräldrar
> Ich besuche meinen Vater. = Jag hälsar på min pappa. (ackusativ)
## Obs!
- Svenskans **sin** finns inte – tyskan säger alltid sein/ihr: Er liebt **seine** Frau. Sie liebt **ihren** Mann.
- euer tappar e när det får ändelse: **eure** Kinder
`, ex: `
? Das ist ___ Bruder. (min) | mein | meine, meinen = Det är min bror.
? Wo ist ___ Mutter? (din) | deine | dein, deinen = Var är din mamma?
? Anna besucht ___ Oma. | ihre | seine, ihr = Anna hälsar på sin mormor.
? Tom ruft ___ Vater an. | seinen | sein, ihren = Tom ringer sin pappa.
? Das sind ___ Kinder. (våra) | unsere | unser, unseren = Det är våra barn.
? Ist das ___ Auto, Herr Weber? | Ihr | Sein, Dein = Är det Er bil, herr Weber?
? Ich liebe ___ Frau. | meine | mein, meinen = Jag älskar min fru.
_ Er sucht ___ (sin) Schlüssel. | seinen = Han letar efter sin nyckel.
> Det är min syster. = Das ist meine Schwester.
`},
{ id: 'g-a1-modal', level: 'A1', title: 'Modalverb', sv: 'können, müssen, wollen …', text: `
Modalverb kombineras med ett annat verb i **infinitiv**, som hamnar **sist** i satsen:
> Ich kann gut schwimmen. = Jag kan simma bra.
> Wir müssen heute arbeiten. = Vi måste arbeta i dag.
| | können | müssen | wollen | dürfen | sollen | möchten |
| ich | kann | muss | will | darf | soll | möchte |
| du | kannst | musst | willst | darfst | sollst | möchtest |
| er/sie | kann | muss | will | darf | soll | möchte |
| wir/sie | können | müssen | wollen | dürfen | sollen | möchten |
| ihr | könnt | müsst | wollt | dürft | sollt | möchtet |
- **ich och er/sie har samma form** (ingen -t): ich kann, er kann
- **möchten** = skulle vilja (artigt): Ich möchte einen Kaffee.
- **wollen** = vilja (bestämt), inte "kommer att"
- **nicht müssen** = inte behöva: Du musst nicht kommen. = Du behöver inte komma.
`, ex: `
~ Ich kann gut schwimmen. = Jag kan simma bra.
~ Wir müssen heute arbeiten. = Vi måste arbeta i dag.
~ Darf ich hier rauchen? = Får jag röka här?
? Er ___ heute nicht kommen. | kann | kannt, können = Han kan inte komma i dag.
? ___ du mir helfen? | Kannst | Kann, Könnt = Kan du hjälpa mig?
? Ich ___ einen Tee, bitte. | möchte | möchten, möchtest = Jag skulle vilja ha ett te, tack.
? Ihr ___ jetzt nach Hause gehen. | müsst | muss, müssen = Ni måste gå hem nu.
? Du ___ nicht kommen, wenn du keine Zeit hast. | musst | darfst, willst = Du behöver inte komma om du inte har tid.
_ Sie ___ (wollen) Ärztin werden. | will = Hon vill bli läkare.
> Jag måste arbeta i morgon. = Ich muss morgen arbeiten.
`},
{ id: 'g-a1-delbara', level: 'A1', title: 'Delbara verb', sv: 'aufstehen → ich stehe … auf', text: `
Många verb har ett **prefix som lossnar** och hamnar **sist** i satsen:
> aufstehen: Ich stehe um sieben Uhr auf. = Jag stiger upp klockan sju.
> einkaufen: Wir kaufen am Samstag ein. = Vi handlar på lördag.
> anrufen: Ruf mich morgen an! = Ring mig i morgon!
## Vanliga delbara prefix
**an, auf, aus, ein, mit, vor, zu, ab, zurück, weg, fern, los**: anfangen, aufmachen, aussteigen, einsteigen, mitkommen, zumachen, abfahren, zurückkommen, fernsehen
## Prefix som INTE lossnar
**be-, ver-, er-, ent-, ge-, zer-, emp-, miss-**: bezahlen → Ich bezahle. verstehen → Ich verstehe.
## Med modalverb
Står verbet i infinitiv sist är det ihopskrivet: Ich muss morgen früh **aufstehen**.
`, ex: `
~ Ich stehe jeden Tag um sieben Uhr auf. = Jag stiger upp klockan sju varje dag.
~ Wir kaufen am Samstag ein. = Vi handlar på lördag.
~ Der Zug fährt um acht Uhr ab. = Tåget avgår klockan åtta.
? Ich ___ dich morgen an. | rufe | anrufe, rufen = Jag ringer dig i morgon.
? Wann ___ der Film an? (anfangen) | fängt | anfängt, fangt = När börjar filmen?
? Kommst du ___? | mit | an, zu = Följer du med?
? Ich muss morgen früh ___. | aufstehen | stehen auf, aufstehe = Jag måste stiga upp tidigt i morgon.
_ Bitte mach die Tür ___. (stäng) | zu = Stäng dörren, tack.
> Han ser på tv på kvällen. = Er sieht am Abend fern. | Am Abend sieht er fern.
`},
{ id: 'g-a1-starka', level: 'A1', title: 'Starka verb i presens', sv: 'fahren → du fährst', auto: 'verbs', text: `
Vissa verb byter vokal i **du** och **er/sie/es** (bara där!):
| | fahren (a→ä) | sprechen (e→i) | sehen (e→ie) |
| ich | fahre | spreche | sehe |
| du | **fährst** | **sprichst** | **siehst** |
| er/sie | **fährt** | **spricht** | **sieht** |
| wir | fahren | sprechen | sehen |
## Vanliga
- **a → ä**: fahren, schlafen, tragen, waschen, fallen, laufen (äu)
- **e → i**: sprechen, essen (isst), geben, nehmen (nimmt), helfen, treffen, vergessen
- **e → ie**: sehen, lesen, empfehlen
I ordlistan står formen för er/sie/es först i parentesen: fahren (**fährt**, fuhr, ist gefahren).
`, ex: `
_ Du ___ (fahren) zu schnell. | fährst = Du kör för fort.
_ Er ___ (sprechen) gut Deutsch. | spricht = Han talar bra tyska.
_ ___ (sehen) du das? | Siehst = Ser du det?
_ Sie ___ (lesen) ein Buch. | liest = Hon läser en bok.
_ Was ___ (essen) du gern? | isst = Vad äter du gärna?
? Das Baby ___ noch. | schläft | schlaft, schläfst = Bebisen sover fortfarande.
? Er ___ den Bus. | nimmt | nehmt, nimmst = Han tar bussen.
? Wir ___ morgen nach Berlin. | fahren | fähren, fahrt = Vi åker till Berlin i morgon.
`},
{ id: 'g-a1-tid', level: 'A1', title: 'Klockan och datum', sv: 'Wie spät ist es?', text: `
> Wie spät ist es? / Wie viel Uhr ist es? = Vad är klockan?
| 8.00 | acht Uhr |
| 8.15 | Viertel nach acht |
| 8.30 | **halb neun** (halv nio – som svenska!) |
| 8.45 | Viertel vor neun |
| 8.10 | zehn nach acht |
| 8.25 | fünf vor halb neun |
- **um** + klockslag: **um** acht Uhr = klockan åtta
- **am** + dag/dygnsdel: **am** Montag, **am** Abend, **am** Wochenende
- **im** + månad/årstid: **im** Mai, **im** Sommer
- Datum: **am ersten Mai** = den första maj. Heute ist **der** dritte Juni.
`, ex: `
? Wir treffen uns ___ acht Uhr. | um | am, im = Vi träffas klockan åtta.
? Ich arbeite ___ Montag. | am | um, im = Jag arbetar på måndag.
? ___ Sommer fahren wir nach Italien. | Im | Am, Um = På sommaren åker vi till Italien.
? 7.30 = ___ acht | halb | Viertel, nach = halv åtta
? ___ Abend lese ich. | Am | Im, Um = På kvällen läser jag.
? Mein Geburtstag ist ___ Oktober. | im | am, um = Min födelsedag är i oktober.
_ 9.15 = Viertel ___ neun | nach = kvart över nio
_ 6.45 = Viertel ___ sieben | vor = kvart i sju
`},
);
