# DnD Notulist

**DnD Notulist** is een slimme, privacyvriendelijke notulist voor Dungeons & Dragons-sessies. Je zet de website open tijdens het spelen, laat de app meeluisteren en krijgt automatisch een overzicht van wat er in het avontuur gebeurt.

**De eerste mijlpaal is een betrouwbare, voldoende snelle live transcriptie op de Windows-laptop.** Op langere termijn willen we die transcripten laten omzetten in **bruikbare sessienotities**: wie de groep ontmoet, welke informatie de Dungeon Master geeft, waar de personages naartoe gaan, welke keuzes ze maken, welke voorwerpen ze vinden en wat er tijdens belangrijke gevechten gebeurt. Ook opvallende of grappige momenten mogen een plaats krijgen.

## Wat willen we bereiken?

- **Live transcriptie eerst:** gesproken tekst verschijnt tijdens het spel zonder voortdurend oplopende verwerkingsachterstand. Automatische notities volgen later.
- **Gewoon een website:** eerst werkend op een Windows-laptop, zonder verplichte app-installatie. Een smartphoneversie komt alleen ter sprake als er na voltooiing nog behoefte aan is.
- **Privacy voorop:** audio wordt lokaal verwerkt en nooit als opname bewaard of naar een AI-server gestuurd.
- **Offline bruikbaar:** na het eenmalig downloaden van de benodigde bestanden moet de app zonder internet kunnen werken.
- **Vlaams en D&D-taalgebruik:** gesprekken in het Nederlands/Vlaams, afgewisseld met Engelse namen en speltermen.
- **Je houdt de controle:** je kunt notities verbeteren en aanvullen; je eigen correcties krijgen altijd voorrang.
- **Aanpasbaar aan je campagne:** namen, locaties en begrippen uit eerdere sessieverslagen kunnen helpen bij het herkennen van nieuwe gebeurtenissen.
- **Verschillende AI-modellen:** de app is niet afhankelijk van één model. Een blijvende testmodus helpt modellen en instellingen vergelijken op snelheid, geheugenverbruik en kwaliteit.

DnD Notulist moet vooral **weinig rekenkracht en geheugen gebruiken**, terwijl de notities snel, correct en nuttig blijven. De **Windows-laptop** is het eerste testtoestel; smartphoneontwikkeling (waaronder Pixel 6a) staat voor onbepaalde tijd on hold.

## Status

Er is nu een werkende browserapp met campagnes, bewerkbare sessienotities, lokale opslag, Markdown-export, een campagnewoordenboek en een permanente testmodus. De lokale AI-integratie gebruikt **Gemma 4 E2B Mobile QAT ONNX** (circa 2,57 GB modelgewichten) via WebGPU. De oude ~4GB-variant is niet langer de modelstandaard. Je kiest eerst een campagne; modellen en tests staan achter het instellingenicoon. Bij een opname of test wordt het model automatisch gedownload indien nodig en geladen, en daarna hergebruikt zolang de pagina openblijft. Een voorafgaande test is aanbevolen, maar blokkeert de opnameknop niet.

De app is een **experimenteel prototype**. Een echte Windows-/Chrome-/WebGPU-proef bevestigde dat Gemma 4 QAT laadt en audio verwerkt, maar de gecombineerde transcriptie-/notitieverwerking duurde circa 3,6 keer de audioduur en de notitie-output was niet betrouwbaar bruikbaar. De **volgende, nog niet geïmplementeerde** mijlpaal is gespecialiseerde meertalige spraakherkenning testen (zoals Whisper Tiny/Base), gevolgd door eenvoudige notitieaanvullingen uit een transcript. Ook de trage, telkens herhaalde SHA-256-cachecontrole moet worden aangepakt. Geen cloud-AI, geen verplichte Pixel-test.

### Lokaal starten

Gebruik Node.js 24 (minimaal 22.12):

```bash
ONNXRUNTIME_NODE_INSTALL=skip npm ci
npm run dev
```

De omgevingsvariabele slaat alleen de optionele native CUDA-download over; de app gebruikt ONNX Runtime in de browser. Voor offline gebruik maak je de productiebuild:

```bash
npm run build
npm run preview
```

Voor **Cloudflare Pages** gebruik je `npm run build:cloudflare` als buildcommando en `dist` als outputdirectory. Stel `NODE_VERSION=24` en `ONNXRUNTIME_NODE_INSTALL=skip` in als omgevingsvariabelen. Deze build houdt rekening met de maximale bestandsgrootte van Pages.

Lees **[Ontwikkeling en testen](docs/DEVELOPMENT.md)** voor browservereisten, de testcommando's, hosting en privacycontroles. De volledige voortgang tegenover de blauwdruk staat in **[Implementatiestatus](docs/IMPLEMENTATION_STATUS.md)**.

## Voor ontwikkelaars en AI coding agents

De actuele productkeuze (Windows-first, transcriptie-first) en de technische blauwdruk staan in **[docs/TECHNICAL_DESIGN.md](docs/TECHNICAL_DESIGN.md)**. De milestones zijn [#35 live ASR](https://github.com/sander-van-damme/dnd-notulist/issues/35), [#4 snelle cache](https://github.com/sander-van-damme/dnd-notulist/issues/4) en vervolgens [#33 eenvoudige notitieanalyse](https://github.com/sander-van-damme/dnd-notulist/issues/33). Lees deze vóór implementatie; oudere Pixel-/Gemma-eisen zijn historische context.
